'use client'

import '@/app/globals.css';
import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/plyr/theme.css';
import styles from '@/app/details/details.module.css';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  type MediaProviderAdapter,
} from "@vidstack/react";
import { PlyrLayout, plyrLayoutIcons } from '@vidstack/react/player/layouts/plyr';
import { AirPlayButton } from '@vidstack/react';
import { GoogleCastButton } from '@vidstack/react';
import { AirPlayIcon, ChromecastIcon } from '@vidstack/react/icons';

import Hls from "hls.js";
import { useSearchParams } from 'next/navigation';
import { CoreEventMap, PeerDetails } from "p2p-media-loader-core";
import { HlsJsP2PEngine, HlsWithP2PConfig } from "p2p-media-loader-hlsjs";
import { useIsClient } from '@/app/hooks/useIsClient';
import Menus from "@/app/ui/menu/menu";
import * as d3 from "d3";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface VideoUrl {
  Id: number;
  Url: string;
  Proxy: string;
  ProxyName: string;
  PlaybackURL: PlaybackURL[];
}

interface PlaybackURL {
  Url: string;
  Name: string;
}

interface Video {
  Id: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  Title: string;
  Describe: string;
  Alias?: string;
  Connection: number;
  Url: string;
  Cover: string;
  VideoGroupId: number;
  Duration?: string;
  ViewCount?: number;
  VideoUrlArr: VideoUrl[];
}

export default function Page() {

  return (
    <>
      <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
        <Details />
      </Suspense>
    </>
  );
}


function Details() {
  const isClient = useIsClient();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id');
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [videoIdx, setVideoIdx] = useState<string>("0");
  const [peers, setPeers] = useState<string[]>([]);
  const [video, setVideo] = useState<Video>({
    Id: 0,
    CreatedAt: "",
    UpdatedAt: "",
    DeletedAt: null,
    Title: "",
    Describe: "",
    Connection: 0,
    Url: "",
    Cover: "",
    VideoGroupId: 0,
    VideoUrlArr: []
  });
  const data = useRef<DownloadStats>({
    httpDownloaded: 0,
    p2pDownloaded: 0,
    p2pUploaded: 0,
  });

  const onPeerConnect = useCallback((params: PeerDetails) => {

    if (params.streamType !== "main") return;

    setPeers((peers) => {
      return [...peers, params.peerId];
    });
  }, []);

  const onChunkDownloaded = useCallback(
    (bytesLength: number, downloadSource: string) => {
      switch (downloadSource) {
        case "http":
          data.current.httpDownloaded += bytesLength;
          break;
        case "p2p":
          data.current.p2pDownloaded += bytesLength;
          break;
        default:
          break;
      }
    },
    [],
  );

  const onChunkUploaded = useCallback((bytesLength: number) => {
    data.current.p2pUploaded += bytesLength;
  }, []);

  const onPeerClose = useCallback((params: PeerDetails) => {
    if (params.streamType !== "main") return;

    setPeers((peers) => {
      return peers.filter((peer) => peer !== params.peerId);
    });
  }, []);

  const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
    if (isHLSProvider(provider)) {
      const HlsWithP2P = HlsJsP2PEngine.injectMixin(Hls);
      provider.library = HlsWithP2P as unknown as typeof Hls;
      const config: HlsWithP2PConfig<typeof Hls> = {
        p2p: {
          core: {
            swarmId: streamUrl ? streamUrl : undefined,
          },
          onHlsJsCreated: (hls) => {
            subscribeToUiEvents({
              engine: hls.p2pEngine,
              onPeerConnect,
              onPeerClose,
              onChunkDownloaded,
              onChunkUploaded,
            });

            // 在清单加载完成后，默认切到最高清晰度开始播放（保留 ABR 自动调节能力）。
            const h = hls as unknown as Hls;
            h.on(Hls.Events.MANIFEST_PARSED, () => {
              try {
                const levels = (h.levels ?? []) as Array<{ height?: number; bitrate?: number }>;
                if (!levels.length) return;

                // 取消按播放器尺寸限制清晰度，确保可以选择到最高等级。
                if (h.config && typeof h.config.capLevelToPlayerSize !== 'undefined') {
                  h.config.capLevelToPlayerSize = false;
                }

                // 优先以分辨率 height 最大为“高清”；若无 height，则以 bitrate 最大。
                let bestIndex = 0;
                for (let i = 1; i < levels.length; i++) {
                  const prevH = levels[bestIndex]?.height ?? 0;
                  const currH = levels[i]?.height ?? 0;
                  if (currH > prevH) bestIndex = i;
                }

                if ((levels[bestIndex]?.height ?? 0) === 0) {
                  // 回退：按码率选择最大值。
                  bestIndex = levels.reduce((bi, lvl, idx) => {
                    const prevBR = levels[bi]?.bitrate ?? 0;
                    const currBR = lvl?.bitrate ?? 0;
                    return currBR > prevBR ? idx : bi;
                  }, 0);
                }
                // 设置当前清晰度为最高，作为初始播放等级；ABR 仍可后续自动调整。
                h.currentLevel = bestIndex;
              } catch {
                // 安静失败，避免影响播放。
              }
            });
          },
        },
      };
      provider.config = config;
    }
  }, [streamUrl, onPeerConnect, onPeerClose, onChunkDownloaded, onChunkUploaded]);

  useEffect(() => {
    // 定义一个函数来创建和更新 JSON-LD 脚本
    const updateJsonLd = (video: Video) => { // 参数名改为 video 更清晰
      // 1. 先移除旧的脚本，防止重复
      const oldScript = document.getElementById('movie-json-ld');
      if (oldScript) {
        oldScript.remove();
      }

      // 2. 如果没有视频数据，则不创建新脚本
      if (!video) return;

      // 3. 创建 JSON-LD 数据结构
      const jsonLdData = {
        '@context': 'https://schema.org',
        '@type': 'Movie',
        name: video.Title,
        description: video.Describe,
        // 如果有封面图URL，可以加在这里
        image: video.Cover || '',
        // 如果有上映日期，可以加在这里
        // datePublished: "你的上映日期",
        // 使用 Alias 字段作为别名 (alternateName)
        alternateName: video.Alias
          ? video.Alias.split("/").map(alias => alias.trim()).filter(Boolean)
          : [],
        // 这里的 genre 和 keywords 应该是从你的数据中获取的
        // 如果你的API不提供，可以留空或根据Title/Describe硬编码一些
        genre: ["电影"], // 示例: ["科幻", "动作"]
        keywords: "在线观看, 下载, 高清" // 示例: "太空旅行, 人工智能"
      };

      // 4. 创建 script 标签
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'movie-json-ld'; // 给它一个ID，方便下次查找和移除
      script.innerHTML = JSON.stringify(jsonLdData);

      // 5. 将新脚本注入到 document.head 中
      document.head.appendChild(script);
    };

    const fetchMovies = async () => {
      // 增加一个判断，如果没有 videoId 就不执行请求
      if (!videoId) return;

      const response = await fetch(`${API_URL}/api/v1/video/get?Id=${videoId}`);
      if (!response.ok) {
        console.error("Failed to fetch video data:", response.status);
        return;
      }

      const result: { Data: Video } = await response.json();
      const videoDataObject = result.Data; // 【关键修复】从结果中提取出真正的 Video 对象
      if (!videoDataObject) {
        console.error("Video data is null in API response");
        return;
      }
      setVideo(videoDataObject);
      if (videoDataObject.VideoUrlArr.length > 0) {
        let initialIdx = 0;
        if (videoId) {
          const stored = localStorage.getItem(videoId);
          initialIdx = Number(stored ?? "0");
          setVideoIdx(String(initialIdx));
          localStorage.setItem(videoId, String(initialIdx));
        }
        // --- 使用 videoDataObject 更新所有内容 ---\
        for (const i in videoDataObject.VideoUrlArr) {
          videoDataObject.VideoUrlArr[i].PlaybackURL = parseM3u8URLs(videoDataObject.VideoUrlArr[i].Url)
        }
        setStreamUrl(videoDataObject.VideoUrlArr[0].PlaybackURL[initialIdx].Url);
      } else {
        setStreamUrl(videoDataObject.Url);
      }
      //  更新页面标题
      document.title = `${videoDataObject.Title}-在线观看-下载`;

      //  更新 meta description
      let metaDesc = document.querySelector("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", videoDataObject.Describe || "暂无简介");

      // 【关键修复】传入正确的 videoDataObject
      updateJsonLd(videoDataObject);

      // 【代码清理】完全移除关于 meta keywords 的旧代码块
    };

    fetchMovies();

    // 返回一个清理函数，在组件卸载或 videoId 改变时执行
    return () => {
      const script = document.getElementById('movie-json-ld');
      if (script) {
        script.remove();
      }
    };
  }, [videoId]);

  const changeVideoIdx = (name: string) => {
    for (const i in video.VideoUrlArr[0].PlaybackURL) {
      if (name == video.VideoUrlArr[0].PlaybackURL[i].Name) {
        if (videoId) {
          localStorage.setItem(videoId, i);
          setStreamUrl(video.VideoUrlArr[0].PlaybackURL[i].Url);
          setVideoIdx(i)
        }
      }
    }
  }

  return (
    <div>
      <div >
        <div className={styles["video-container"]}>
          <Menus />
          <MediaPlayer
            storage="7x-chat-media-player"
            src={streamUrl}
            load="visible"
            posterLoad="visible"
            viewType='video'
            streamType='on-demand'
            logLevel='warn'
            // autoPlay
            onProviderChange={onProviderChange}
            playsInline
          >
            <MediaProvider />
            <AirPlayButton className="media-button">
              <AirPlayIcon />
            </AirPlayButton>
            <GoogleCastButton className="media-button">
              <ChromecastIcon />
            </GoogleCastButton>
            {isClient && <PlyrLayout icons={plyrLayoutIcons} />}
          </MediaPlayer>

          {/* Video list buttons */}
          {video.VideoUrlArr && video.VideoUrlArr.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {video.VideoUrlArr[0].PlaybackURL.length > 0 && video.VideoUrlArr[0].PlaybackURL.map((item, idx) => (
                <button
                  key={item.Name}
                  onClick={() => changeVideoIdx(item.Name)}
                  className={`btn btn-sm ${String(idx) === videoIdx ? 'btn-primary' : 'btn-outline'}`}
                >
                  {item.Name || `Video ${item.Name}`}
                </button>
              ))}
            </div>
          )}
          <div className='relative inset-y-3'>
            <h1 className="text-3xl font-semibold">{video.Title}</h1>
          </div>
          <br />
          <div  >
            <div dangerouslySetInnerHTML={{ __html: video.Describe }}></div>
          </div>
          <div className={styles["node-container"]} >
            <NodeNetwork peers={peers} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 解析包含影片播放源的特定格式字符串
 * @param input - 原始字符串
 * @returns PlaybackURL 物件陣列
 */
function parseM3u8URLs(input: string): PlaybackURL[] {
  // 1. 使用 '$$$' 分割字符串，並取得最後一部分，如果不存在則返回空字串
  const relevantPart = input.split('$$$').pop() || '';

  // 2. 如果有效部分為空，直接返回空陣列
  if (!relevantPart) {
    return [];
  }

  // 3. 按 '#' 分割成每個影片的條目
  const entries = relevantPart.split('#');

  // 4. 使用 map 和 filter 處理陣列
  return entries
    .map(entry => {
      // a. 按 '$' 分割名稱和 URL
      const [name, url] = entry.split('$', 2);

      // b. 檢查 name 和 url 是否存在，並去除頭尾多餘的空格
      if (name && url) {
        return {
          Name: name.trim(),
          Url: url.trim()
        };
      }
      // 如果分割失敗，返回 null
      return null;
    })
    // c. 過濾掉所有 null 的結果以及 URL 不以 .m3u8 結尾的條目
    .filter((item): item is PlaybackURL =>
      item !== null && item.Url.endsWith('.m3u8')
    );
}

type UIEventsProps = PlayerEvents & {
  engine: HlsJsP2PEngine;
};

const subscribeToUiEvents = ({
  engine,
  onPeerConnect,
  onPeerClose,
  onChunkDownloaded,
  onChunkUploaded,
}: UIEventsProps) => {
  if (onPeerConnect) engine.addEventListener("onPeerConnect", onPeerConnect);
  if (onPeerClose) {
    engine.addEventListener("onPeerClose", onPeerClose);
  }
  if (onChunkDownloaded) {
    engine.addEventListener("onChunkDownloaded", onChunkDownloaded);
  }
  if (onChunkUploaded) {
    engine.addEventListener("onChunkUploaded", onChunkUploaded);
  }
};

type HlsWithP2PType = ReturnType<typeof HlsJsP2PEngine.injectMixin>;

declare global {
  interface Window {
    shaka?: unknown;
    Hls?: HlsWithP2PType;
    LevelSelector: unknown;
    DashShakaPlayback: unknown;
    Clappr: {
      Player: unknown;
    };
  }
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

export type ChartsData = {
  seconds: number;
} & DownloadStats;


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

export type PlayerEvents = Omit<
  PlayerProps,
  "streamUrl" | "announceTrackers" | "swarmId"
>;

const COLORS = {
  yellow: "#faf21b",
  lightOrange: "#ff7f0e",
  lightBlue: "#ADD8E6",
  torchRed: "#ff1745",
  links: "#C8C8C8",
  nodeHover: "#A9A9A9",
  node: (d: { isMain?: boolean }) => {
    return d.isMain ? "hsl(210, 70%, 72.5%)" : "hsl(55, 70%, 72.5%)";
  },
};

type GraphNetworkProps = {
  peers: string[];
};

const DEFAULT_PEER_ID = "You";
const DEFAULT_NODE: Node = { id: DEFAULT_PEER_ID, isMain: true };
const DEFAULT_GRAPH_DATA = {
  nodes: [DEFAULT_NODE],
  links: [] as Link[],
};

const NodeNetwork = ({ peers }: GraphNetworkProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const networkDataRef = useRef(DEFAULT_GRAPH_DATA);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  const [svgDimensions, setSvgDimensions] = useState<SvgDimensionsType>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];

      const newDimensions = {
        width: entry.contentRect.width,
        height: entry.contentRect.width > 380 ? 250 : 400,
      };

      setSvgDimensions(newDimensions);

      simulationRef.current?.stop();
      simulationRef.current = createSimulation(
        newDimensions.width,
        newDimensions.height,
      );

      updateGraph(
        networkDataRef.current.nodes,
        networkDataRef.current.links,
        simulationRef.current,
        svgRef.current,
      );
    };

    prepareGroups(svgRef.current);

    const resizeObserver = new ResizeObserver(handleResize);

    if (svgContainerRef.current) {
      resizeObserver.observe(svgContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const allNodes = [
      ...peers.map((peerId) => ({ id: peerId, isMain: false })),
      DEFAULT_NODE,
    ];

    const allLinks = peers.map((peerId) => {
      const target = allNodes.find((n) => n.id === peerId);

      if (!target) throw new Error("Target node not found");

      return {
        source: DEFAULT_NODE,
        target,
        linkId: `${DEFAULT_PEER_ID}-${peerId}`,
      };
    });

    const networkData = networkDataRef.current;

    const nodesToAdd = allNodes.filter(
      (an) => !networkData.nodes.find((n) => n.id === an.id),
    );
    const nodesToRemove = networkData.nodes.filter(
      (n) => !allNodes.find((an) => an.id === n.id),
    );
    const linksToAdd = allLinks.filter(
      (al) => !networkData.links.find((l) => l.linkId === al.linkId),
    );
    const linksToRemove = networkData.links.filter(
      (l) => !allLinks.find((al) => al.linkId === l.linkId),
    );

    const updatedNodes = networkData.nodes.filter(
      (n) => !nodesToRemove.find((rn) => rn.id === n.id),
    );
    const updatedLinks = networkData.links.filter(
      (l) => !linksToRemove.find((rl) => rl.linkId === l.linkId),
    );

    const newNetworkData = {
      nodes: [...updatedNodes, ...nodesToAdd],
      links: [...updatedLinks, ...linksToAdd],
    };

    networkDataRef.current = newNetworkData;

    updateGraph(
      newNetworkData.nodes,
      newNetworkData.links,
      simulationRef.current,
      svgRef.current,
    );
  }, [peers]);

  return (
    <div ref={svgContainerRef} className="node-container">
      <svg
        className="node-network"
        ref={svgRef}
        width={svgDimensions.width}
        height={svgDimensions.height}
      />
    </div>
  );
};



export interface Node extends d3.SimulationNodeDatum {
  id: string;
  isMain?: boolean;
  group?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link extends d3.SimulationLinkDatum<Node> {
  source: Node;
  target: Node;
  linkId: string;
}

function handleNodeMouseOver(this: SVGCircleElement) {
  d3.select(this).style("fill", COLORS.nodeHover);
}

function handleNodeMouseOut(this: SVGCircleElement, _event: unknown, d: Node) {
  d3.select(this).style("fill", COLORS.node(d));
}

function getLinkText(d: Link) {
  return `${d.source.id}-${d.target.id}`;
}

function getNodeId(d: Node) {
  return d.id;
}

function removeD3Item(this: d3.BaseType) {
  d3.select(this).remove();
}

const updateGraph = (
  newNodes: Node[],
  newLinks: Link[],
  simulation: d3.Simulation<Node, Link> | null,
  svgElement: SVGSVGElement | null,
) => {
  if (!simulation || !svgElement) return;

  simulation.nodes(newNodes);
  simulation.force<d3.ForceLink<Node, Link>>("link")?.links(newLinks);
  simulation.alpha(0.5).restart();

  const link = d3
    .select(svgElement)
    .select(".links")
    .selectAll<SVGLineElement, Link>("line")
    .data(newLinks, getLinkText);

  link
    .enter()
    .append("line")
    .merge(link)
    .attr("stroke", COLORS.links)
    .transition()
    .duration(500)
    .attr("stroke-width", 0.5);

  link
    .exit()
    .transition()
    .duration(200)
    .style("opacity", 0)
    .on("end", removeD3Item);

  const node = d3
    .select(svgElement)
    .select(".nodes")
    .selectAll<SVGCircleElement, Node>("circle")
    .data(newNodes, getNodeId);

  node
    .enter()
    .append("circle")
    .merge(node)
    .attr("r", (d) => (d.isMain ? 15 : 13))
    .attr("fill", (d) => COLORS.node(d))
    .on("mouseover", handleNodeMouseOver)
    .on("mouseout", handleNodeMouseOut)
    .call(drag(simulation));

  node.exit().transition().duration(200).attr("r", 0).remove();

  const text = d3
    .select(svgElement)
    .select(".nodes")
    .selectAll<SVGTextElement, Node>("text")
    .data(newNodes, getNodeId);

  text
    .enter()
    .append("text")
    .style("fill-opacity", 0)
    .merge(text)
    .text(getNodeId)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-family", "sans-serif")
    .transition()
    .duration(500)
    .style("fill-opacity", 1);

  text
    .exit()
    .transition()
    .duration(200)
    .style("fill-opacity", 0)
    .on("end", removeD3Item);

  simulation.on("tick", () => {
    d3.select(svgElement)
      .select(".links")
      .selectAll<SVGLineElement, Link>("line")
      .attr("x1", (d) => d.source.x ?? 0)
      .attr("y1", (d) => d.source.y ?? 0)
      .attr("x2", (d) => d.target.x ?? 0)
      .attr("y2", (d) => d.target.y ?? 0);

    d3.select(svgElement)
      .select(".nodes")
      .selectAll<SVGCircleElement, Node>("circle")
      .attr("cx", (d) => d.x ?? 0)
      .attr("cy", (d) => d.y ?? 0);

    d3.select(svgElement)
      .select(".nodes")
      .selectAll<SVGTextElement, Node>("text")
      .attr("x", (d) => d.x ?? 0)
      .attr("y", (d) => (d.y === undefined ? 0 : d.y - 20));
  });
};

const drag = (simulation: d3.Simulation<Node, Link>) => {
  const dragStarted = (
    event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
    d: Node,
  ) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  const dragged = (
    event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
    d: Node,
  ) => {
    d.fx = event.x;
    d.fy = event.y;
  };

  const dragEnded = (
    event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
    d: Node,
  ) => {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  };

  return d3
    .drag<SVGCircleElement, Node>()
    .on("start", dragStarted)
    .on("drag", dragged)
    .on("end", dragEnded);
};

const prepareGroups = (svg: SVGElement) => {
  if (d3.select(svg).select("g.links").empty()) {
    d3.select(svg).append("g").attr("class", "links");
  }

  if (d3.select(svg).select("g.nodes").empty()) {
    d3.select(svg).append("g").attr("class", "nodes");
  }
};

const createSimulation = (width: number, height: number) => {
  return d3
    .forceSimulation<Node, Link>()
    .force("link", d3.forceLink<Node, Link>().id(getNodeId).distance(110))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collide",
      d3
        .forceCollide<Node>()
        .radius((d) => (d.isMain ? 20 : 15))
        .iterations(2),
    );
};