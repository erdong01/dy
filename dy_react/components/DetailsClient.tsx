'use client';

import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/plyr/theme.css';
import styles from '../app/details/details.module.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isHLSProvider, MediaPlayer, MediaProvider, type MediaProviderAdapter } from "@vidstack/react";
import { PlyrLayout, plyrLayoutIcons } from '@vidstack/react/player/layouts/plyr';
import Hls from "hls.js";
import { CoreEventMap, PeerDetails } from "p2p-media-loader-core";
import { HlsJsP2PEngine, HlsWithP2PConfig } from "p2p-media-loader-hlsjs";
import { useIsClient } from '../app/hooks/useIsClient';
import { useLanguage } from '../app/lib/LanguageContext';
import * as d3 from "d3";
import type { Video, VideoUrl, PlaybackURL } from '../app/lib/types';
import Link from 'next/link';

// 与后端 PascalCase 字段对齐的分类类型
export type VideoCategory = {
  Id: number;
  Name: string;
  ParentId?: number;
  Type?: number | null;
  SonCategory?: Array<{
    Id: number;
    Name: string;
    ParentId?: number;
  }>;
};

export type DetailsClientProps = {
  initialVideo: Video;
  initialStreamUrl: string;
  initialVideoIdx: string;
  categories?: VideoCategory[];
  showPlayer?: boolean;
  autoPlay?: boolean;
  onRevealPlayer?: () => void;
};

export default function DetailsClient({ initialVideo, initialStreamUrl, initialVideoIdx, categories = [], showPlayer, autoPlay, onRevealPlayer }: DetailsClientProps) {
  const { t } = useLanguage();
  const isClient = useIsClient();
  const [streamUrl, setStreamUrl] = useState<string>(initialStreamUrl);
  const [videoIdx, setVideoIdx] = useState<string>(initialVideoIdx);
  // 新增：分组索引与刷新持久化支持
  const [groupIdx, setGroupIdx] = useState<number>(0);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [peers, setPeers] = useState<string[]>([]);
  const video = initialVideo;
  const shouldShowPlayer = showPlayer ?? true;
  const shouldAutoPlay = autoPlay ?? false;
  const handleRevealPlayer = onRevealPlayer ?? (() => { });

  const data = useRef<DownloadStats>({ httpDownloaded: 0, p2pDownloaded: 0, p2pUploaded: 0 });

  const onPeerConnect = useCallback((params: PeerDetails) => {
    if (params.streamType !== "main") return;
    setPeers((peers) => [...peers, params.peerId]);
  }, []);

  const onChunkDownloaded = useCallback((bytesLength: number, downloadSource: string) => {
    switch (downloadSource) {
      case "http":
        data.current.httpDownloaded += bytesLength;
        break;
      case "p2p":
        data.current.p2pDownloaded += bytesLength;
        break;
    }
  }, []);

  const onChunkUploaded = useCallback((bytesLength: number) => {
    data.current.p2pUploaded += bytesLength;
  }, []);

  const onPeerClose = useCallback((params: PeerDetails) => {
    if (params.streamType !== "main") return;
    setPeers((peers) => peers.filter((peer) => peer !== params.peerId));
  }, []);

  const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
    // 当使用 HLS 播放时，启用 P2P + 自适应码率，并添加卡顿/错误自动恢复，避免因网络抖动而暂停。
    if (isHLSProvider(provider)) {
      const HlsWithP2P = HlsJsP2PEngine.injectMixin(Hls);
      provider.library = HlsWithP2P as unknown as typeof Hls;
      const config: HlsWithP2PConfig<typeof Hls> = {
        // 为满足“优先最高清晰度”的需求，这里不限制到播放器尺寸
        startLevel: -1,
        autoStartLoad: true,
        lowLatencyMode: false,
        capLevelToPlayerSize: false,
        // 缓冲区大小（适度增加容错，减少 rebuffer）：
        maxBufferLength: 25,
        backBufferLength: 30,
        maxBufferHole: 0.5,
        // ABR 初始估计偏保守，弱网更快稳定：
        abrEwmaDefaultEstimate: 500_000, // ~500kbps
        abrBandWidthFactor: 0.8,
        // 适度放宽超时，避免频繁中断：
        manifestLoadingTimeOut: 20000,
        fragLoadingTimeOut: 20000,
        // P2P 设置
        p2p: {
          core: { swarmId: streamUrl ? streamUrl : undefined },
          onHlsJsCreated: (hls) => {
            subscribeToUiEvents({
              engine: hls.p2pEngine,
              onPeerConnect,
              onPeerClose,
              onChunkDownloaded,
              onChunkUploaded,
            });

            const h = hls as unknown as Hls;

            // 让 Hls.js 自己做 ABR，不强行锁最高清晰度
            h.on(Hls.Events.MANIFEST_PARSED, () => {
              try {
                // 选择最高清晰度起播
                const levels = (h.levels ?? []) as Array<{ height?: number; bitrate?: number }>;
                if (!levels.length) return;
                let bestIndex = 0;
                for (let i = 1; i < levels.length; i++) {
                  const prevH = levels[bestIndex]?.height ?? 0;
                  const currH = levels[i]?.height ?? 0;
                  if (currH > prevH) bestIndex = i;
                }
                if ((levels[bestIndex]?.height ?? 0) === 0) {
                  bestIndex = levels.reduce((bi, lvl, idx) => {
                    const prevBR = levels[bi]?.bitrate ?? 0;
                    const currBR = lvl?.bitrate ?? 0;
                    return currBR > prevBR ? idx : bi;
                  }, 0);
                }
                // 关闭自动码率，强制最高清晰度起播
                (h as unknown as { autoLevelEnabled: boolean }).autoLevelEnabled = false;
                h.currentLevel = bestIndex;
              } catch { }
            });

            // 弱网/错误自动恢复：尽量避免「暂停在那儿」的体验
            // 降级/恢复逻辑：
            let lastStallAt = 0;
            let downshiftCooldownUntil = 0;
            const DOWNGRADE_COOLDOWN_MS = 8000; // 每次降级后至少等待 8s 再次降级
            const RECOVER_TO_MAX_AFTER_MS = 30000; // 30s 无卡顿则恢复最高

            const getMaxLevel = () => (h.levels?.length ?? 1) - 1;
            const tryDowngrade = () => {
              const now = Date.now();
              if (now < downshiftCooldownUntil) return;
              const cur = h.currentLevel;
              if (typeof cur === 'number' && cur > 0) {
                h.currentLevel = cur - 1;
                downshiftCooldownUntil = now + DOWNGRADE_COOLDOWN_MS;
              }
            };
            const tryUpgradeToMax = () => {
              const maxL = getMaxLevel();
              if (maxL < 0) return;
              if (h.currentLevel !== maxL) {
                h.currentLevel = maxL;
              }
            };

            h.on(Hls.Events.ERROR, (_evt, data) => {
              if (!data?.fatal) return;
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  // 重启加载，保留当前位置
                  try { h.startLoad(); } catch { }
                  lastStallAt = Date.now();
                  tryDowngrade();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  try { h.recoverMediaError(); } catch { }
                  lastStallAt = Date.now();
                  tryDowngrade();
                  break;
                default:
                  // 兜底：重启加载
                  try { h.stopLoad(); h.startLoad(); } catch { }
                  lastStallAt = Date.now();
                  tryDowngrade();
                  break;
              }
            });

            // 如果发生长时间等待（缓冲不足），尝试轻度“踢一下”继续播
            const media = (h.media ?? null) as HTMLVideoElement | null;
            if (media) {
              const resume = () => {
                if (media.paused && !media.ended) {
                  media.play().catch(() => { });
                }
                lastStallAt = Date.now();
                tryDowngrade();
              };
              media.addEventListener('stalled', resume);
              media.addEventListener('waiting', resume);
              media.addEventListener('suspend', resume);

              // 周期性检测：无卡顿一段时间后，恢复到最高清晰度
              const intervalId = window.setInterval(() => {
                if (!media.ended && !media.paused) {
                  const elapsed = Date.now() - lastStallAt;
                  if (elapsed > RECOVER_TO_MAX_AFTER_MS) {
                    tryUpgradeToMax();
                  }
                }
              }, 5000);

              // 清理
              h.on(Hls.Events.DESTROYING, () => {
                window.clearInterval(intervalId);
                media.removeEventListener('stalled', resume);
                media.removeEventListener('waiting', resume);
                media.removeEventListener('suspend', resume);
              });
            }
          },
        },
      };
      provider.config = config;
    }
  }, [streamUrl, onPeerConnect, onPeerClose, onChunkDownloaded, onChunkUploaded]);

  // 新增：分组索引与切换逻辑
  const changeVideoIdxByIndex = (gIdx: number, idx: number) => {
    const g = video.VideoUrlArr?.[gIdx];
    if (!g?.PlaybackURL?.[idx]) return;
    setGroupIdx(gIdx);
    setStreamUrl(g.PlaybackURL[idx].Url);
    setVideoIdx(String(idx));
  };

  // 刷新恢复：尝试从 localStorage 恢复最近一次的分组与清晰度
  useEffect(() => {
    try {
      const key = `video:play:${video.Id}`;
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (raw) {
        const saved = JSON.parse(raw) as { groupIdx: number; videoIdx: number; streamUrl: string };
        const g = video.VideoUrlArr?.[saved.groupIdx];
        const item = g?.PlaybackURL?.[Number(saved.videoIdx)];
        if (g && item && (item.Url === saved.streamUrl)) {
          setGroupIdx(saved.groupIdx);
          setVideoIdx(String(saved.videoIdx));
          setStreamUrl(saved.streamUrl);
        }
      }
    } catch { }
    setHydrated(true);
  }, [video.Id, video.VideoUrlArr]);

  // 状态变更时持久化到 localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      const key = `video:play:${video.Id}`;
      const payload = JSON.stringify({ groupIdx, videoIdx: Number(videoIdx), streamUrl });
      if (typeof window !== 'undefined') window.localStorage.setItem(key, payload);
    } catch { }
  }, [groupIdx, videoIdx, streamUrl, hydrated, video.Id]);

  // 当切换分组时，如果当前播放源不属于该分组，自动选择该分组第一个播放源
  useEffect(() => {
    // 初次渲染时若尚未完成恢复，避免误触发回退
    if (!hydrated) return;
    if (!video.VideoUrlArr?.length) return;
    const g = video.VideoUrlArr[groupIdx];
    const list = g?.PlaybackURL ?? [];
    if (!list.length) return;
    const valid = list.find((p, idx) => p.Url === streamUrl && String(idx) === videoIdx);
    if (!valid) {
      setStreamUrl(list[0].Url);
      setVideoIdx('0');
    }
  }, [groupIdx, video.VideoUrlArr, streamUrl, videoIdx, hydrated]);

  const getGroupLabel = (group: VideoUrl, idx: number) => {
    return `${t('source')}${idx + 1}`;
  };

  return (
    <div>
      <div>
        <div className={styles["video-container"]}>
          {shouldShowPlayer ? (
            <MediaPlayer
              storage="7x-chat-media-player"
              src={streamUrl}
              load="visible"
              posterLoad="visible"
              viewType='video'
              streamType='on-demand'
              logLevel='warn'
              onProviderChange={onProviderChange}
              autoPlay={shouldAutoPlay}
              playsInline
              crossOrigin
            >
              <MediaProvider />
              {isClient && <PlyrLayout icons={plyrLayoutIcons} />}
            </MediaPlayer>
          ) : (
            <div className="flex items-center justify-center py-20 bg-base-200 rounded">
              <button
                className="flex items-center justify-center rounded-full bg-primary text-primary-content w-20 h-20 shadow-lg hover:scale-105 transition-transform"
                onClick={handleRevealPlayer}
                aria-label={t('show_player')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          )}
          <div className='relative inset-y-3'>
            <h1 className="text-3xl font-semibold">{initialVideo.Title}</h1>
          </div>
          {video.VideoUrlArr && video.VideoUrlArr.length > 0 && (
            <div className="mt-4 space-y-4">
              {/* Tabs 分组选择 */}
              <div role="tablist" className="tabs tabs-bordered">
                {video.VideoUrlArr.map((group: VideoUrl, gIdx: number) => (
                  <button
                    key={gIdx}
                    role="tab"
                    className={`tab ${gIdx === groupIdx ? 'tab-active' : ''}`}
                    onClick={() => setGroupIdx(gIdx)}
                  >
                    {getGroupLabel(group, gIdx)}
                  </button>
                ))}
              </div>
              {/* 当前分组的播放源按钮 */}
              {video.VideoUrlArr[groupIdx]?.PlaybackURL?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {video.VideoUrlArr[groupIdx].PlaybackURL.map((item: PlaybackURL, idx: number) => (
                    <button
                      key={item.Name || idx}
                      onClick={() => changeVideoIdxByIndex(groupIdx, idx)}
                      className={`btn btn-sm ${String(idx) === videoIdx ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {item.Name || `${t('quality')} ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <br />
          <div>
            <div dangerouslySetInnerHTML={{ __html: initialVideo.Describe }}></div>
          </div>
          {/* 使用 daisyUI 渲染分类信息（移植自 /app/details/page.tsx） */}
          {categories?.length > 0 && (
            <section className="container mx-auto py-6">
              <div className="card bg-base-100 shadow">
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <div key={cat.Id} className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex flex-wrap gap-3 items-start">
                        <div className="shrink-0">
                          <span className="badge badge-neutral badge-lg">{cat.Name}：</span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {[...new Map((cat.SonCategory ?? []).map((s) => [s.Id, s])).values()].map((son) => (
                            <Link
                              key={`${cat.Id}-${son.Id}`}
                              href={`/?category=${son.Id}`}
                              className="badge bg-transparent border-0 text-base-content dark:text-white hover:text-primary transition-colors cursor-pointer"
                              prefetch={false}
                            >
                              {son.Name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          <div className={styles["node-container"]}>
            <NodeNetwork peers={peers} />
          </div>
        </div>
      </div>
    </div>
  );
}

export type DownloadStats = {
  httpDownloaded: number;
  p2pDownloaded: number;
  p2pUploaded: number;
};

export type SvgDimensionsType = {
  width: number;
  height: number;
};

export type ChartsData = { seconds: number } & DownloadStats;

export type PlayerProps = {
  streamUrl: string;
  announceTrackers: string[];
  swarmId?: string;
} & Partial<
  Pick<
    CoreEventMap,
    "onPeerConnect" | "onChunkDownloaded" | "onChunkUploaded" | "onPeerClose"
  >
>;

export type PlayerEvents = Omit<PlayerProps, "streamUrl" | "announceTrackers" | "swarmId">;

type UIEventsProps = PlayerEvents & { engine: HlsJsP2PEngine };

const subscribeToUiEvents = ({
  engine,
  onPeerConnect,
  onPeerClose,
  onChunkDownloaded,
  onChunkUploaded,
}: UIEventsProps) => {
  if (onPeerConnect) engine.addEventListener("onPeerConnect", onPeerConnect);
  if (onPeerClose) engine.addEventListener("onPeerClose", onPeerClose);
  if (onChunkDownloaded) engine.addEventListener("onChunkDownloaded", onChunkDownloaded);
  if (onChunkUploaded) engine.addEventListener("onChunkUploaded", onChunkUploaded);
};

const COLORS = {
  links: "#C8C8C8",
  nodeHover: "#A9A9A9",
  node: (d: { isMain?: boolean }) => (d.isMain ? "hsl(210, 70%, 72.5%)" : "hsl(55, 70%, 72.5%)"),
};

type GraphNetworkProps = { peers: string[] };

const DEFAULT_PEER_ID = "You";
const DEFAULT_NODE: Node = { id: DEFAULT_PEER_ID, isMain: true };
const DEFAULT_GRAPH_DATA = { nodes: [DEFAULT_NODE], links: [] as Link[] };

const NodeNetwork = ({ peers }: GraphNetworkProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const networkDataRef = useRef(DEFAULT_GRAPH_DATA);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const [svgDimensions, setSvgDimensions] = useState<SvgDimensionsType>({ width: 0, height: 0 });

  useEffect(() => {
    if (!svgRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      const newDimensions = { width: entry.contentRect.width, height: entry.contentRect.width > 380 ? 250 : 400 };
      setSvgDimensions(newDimensions);
      simulationRef.current?.stop();
      simulationRef.current = createSimulation(newDimensions.width, newDimensions.height);
      updateGraph(networkDataRef.current.nodes, networkDataRef.current.links, simulationRef.current, svgRef.current);
    };

    prepareGroups(svgRef.current);
    const resizeObserver = new ResizeObserver(handleResize);
    if (svgContainerRef.current) resizeObserver.observe(svgContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const allNodes = [...peers.map((peerId) => ({ id: peerId, isMain: false })), DEFAULT_NODE];
    const allLinks = peers.map((peerId) => {
      const target = allNodes.find((n) => n.id === peerId);
      if (!target) throw new Error("Target node not found");
      return { source: DEFAULT_NODE, target, linkId: `${DEFAULT_PEER_ID}-${peerId}` };
    });

    const networkData = networkDataRef.current;
    const nodesToAdd = allNodes.filter((an) => !networkData.nodes.find((n) => n.id === an.id));
    const nodesToRemove = networkData.nodes.filter((n) => !allNodes.find((an) => an.id === n.id));
    const linksToAdd = allLinks.filter((al) => !networkData.links.find((l) => l.linkId === al.linkId));
    const linksToRemove = networkData.links.filter((l) => !allLinks.find((al) => al.linkId === l.linkId));

    const updatedNodes = networkData.nodes.filter((n) => !nodesToRemove.find((rn) => rn.id === n.id));
    const updatedLinks = networkData.links.filter((l) => !linksToRemove.find((rl) => rl.linkId === l.linkId));

    const newNetworkData = { nodes: [...updatedNodes, ...nodesToAdd], links: [...updatedLinks, ...linksToAdd] };
    networkDataRef.current = newNetworkData;
    updateGraph(newNetworkData.nodes, newNetworkData.links, simulationRef.current, svgRef.current);
  }, [peers]);

  return (
    <div ref={svgContainerRef} className="node-container">
      <svg className="node-network" ref={svgRef} width={svgDimensions.width} height={svgDimensions.height} />
    </div>
  );
};

export interface Node extends d3.SimulationNodeDatum { id: string; isMain?: boolean; x?: number; y?: number; fx?: number | null; fy?: number | null; }
export interface Link extends d3.SimulationLinkDatum<Node> { source: Node; target: Node; linkId: string; }

function handleNodeMouseOver(this: SVGCircleElement) { d3.select(this).style("fill", COLORS.nodeHover); }
function handleNodeMouseOut(this: SVGCircleElement, _event: unknown, d: Node) { d3.select(this).style("fill", COLORS.node(d)); }
function getLinkText(d: Link) { return `${d.source.id}-${d.target.id}`; }
function getNodeId(d: Node) { return d.id; }
function removeD3Item(this: d3.BaseType) { d3.select(this).remove(); }

const updateGraph = (newNodes: Node[], newLinks: Link[], simulation: d3.Simulation<Node, Link> | null, svgElement: SVGSVGElement | null) => {
  if (!simulation || !svgElement) return;
  simulation.nodes(newNodes);
  simulation.force<d3.ForceLink<Node, Link>>("link")?.links(newLinks);
  simulation.alpha(0.5).restart();

  const link = d3.select(svgElement).select(".links").selectAll<SVGLineElement, Link>("line").data(newLinks, getLinkText);
  link.enter().append("line").merge(link).attr("stroke", COLORS.links).transition().duration(500).attr("stroke-width", 0.5);
  link.exit().transition().duration(200).style("opacity", 0).on("end", removeD3Item);

  const node = d3.select(svgElement).select(".nodes").selectAll<SVGCircleElement, Node>("circle").data(newNodes, getNodeId);
  node.enter().append("circle").merge(node).attr("r", (d) => (d.isMain ? 15 : 13)).attr("fill", (d) => COLORS.node(d)).on("mouseover", handleNodeMouseOver).on("mouseout", handleNodeMouseOut).call(drag(simulation));
  node.exit().transition().duration(200).attr("r", 0).remove();

  const text = d3.select(svgElement).select(".nodes").selectAll<SVGTextElement, Node>("text").data(newNodes, getNodeId);
  text.enter().append("text").style("fill-opacity", 0).merge(text).text(getNodeId).style("text-anchor", "middle").style("font-size", "12px").style("font-family", "sans-serif").transition().duration(500).style("fill-opacity", 1);
  text.exit().transition().duration(200).style("fill-opacity", 0).on("end", removeD3Item);

  simulation.on("tick", () => {
    d3.select(svgElement).select(".links").selectAll<SVGLineElement, Link>("line")
      .attr("x1", (d) => d.source.x ?? 0).attr("y1", (d) => d.source.y ?? 0)
      .attr("x2", (d) => d.target.x ?? 0).attr("y2", (d) => d.target.y ?? 0);
    d3.select(svgElement).select(".nodes").selectAll<SVGCircleElement, Node>("circle")
      .attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
    d3.select(svgElement).select(".nodes").selectAll<SVGTextElement, Node>("text")
      .attr("x", (d) => d.x ?? 0).attr("y", (d) => (d.y === undefined ? 0 : d.y - 20));
  });
};

const drag = (simulation: d3.Simulation<Node, Link>) => {
  const dragStarted = (event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  };
  const dragged = (event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) => { d.fx = event.x; d.fy = event.y; };
  const dragEnded = (event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; };
  return d3.drag<SVGCircleElement, Node>().on("start", dragStarted).on("drag", dragged).on("end", dragEnded);
};

const prepareGroups = (svg: SVGElement) => {
  if (d3.select(svg).select("g.links").empty()) d3.select(svg).append("g").attr("class", "links");
  if (d3.select(svg).select("g.nodes").empty()) d3.select(svg).append("g").attr("class", "nodes");
};

const createSimulation = (width: number, height: number) => {
  return d3.forceSimulation<Node, Link>()
    .force("link", d3.forceLink<Node, Link>().id(getNodeId).distance(110))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide<Node>().radius((d) => (d.isMain ? 20 : 15)).iterations(2));
};
