'use client'
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
import React, { Suspense } from 'react';
import styles from '@/app/details/details.module.css';
import '@/app/globals.css';
import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  type MediaProviderAdapter,
} from "@vidstack/react";
import { PlyrLayout, plyrLayoutIcons } from '@vidstack/react/player/layouts/plyr';
import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/plyr/theme.css';
import Hls from "hls.js";
import { useSearchParams, useRouter } from 'next/navigation';
import { CoreEventMap, PeerDetails } from "p2p-media-loader-core";
import { HlsJsP2PEngine, HlsWithP2PConfig } from "p2p-media-loader-hlsjs";
import { useCallback, useEffect, useRef, useState } from "react";
import 'tailwindcss/tailwind.css';
import * as d3 from "d3";
import { Helmet } from 'react-helmet';
import Menu from "@/app/ui/menu/menu";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Details />
    </Suspense>
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

interface Video {
  Id: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  Title: string;
  Describe: string;
  Connection: number;
  Url: string;
  Cover: string;
  VideoGroupId: number;
  Duration?: string;
  ViewCount?: number;
  VideoList: Video[];
}

const isIOS = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  // 只需检查 User Agent 字符串中是否包含苹果设备的关键词
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

function Details() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get('id');
  const [streamUrl, setStreamUrl] = useState<string>("");
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
    VideoList: []
  });
  const data = useRef<DownloadStats>({
    httpDownloaded: 0,
    p2pDownloaded: 0,
    p2pUploaded: 0,
  });

  const onPeerConnect = useCallback((params: PeerDetails) => {
    if (isIOS()) {
      return;
    }
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

  ;

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
            swarmId: streamUrl,
          },
          onHlsJsCreated: (hls) => {
            subscribeToUiEvents({
              engine: hls.p2pEngine,
              onPeerConnect,
              onPeerClose,
              onChunkDownloaded,
              onChunkUploaded,

            });
          },
        },
      };
      provider.config = config;
    }
  }, []);
  
  useEffect(() => {
    const fetchMovies = async () => {
      const data = await fetch(`${API_URL}/api/v1/video/get?Id=` + videoId);
      if (!data.ok) {
        console.log(data.status)
        return
      }
      const videoData: { Data: Video } = await data.json();
      setVideo(videoData.Data)
      setStreamUrl(videoData.Data.Url)
    }
    fetchMovies()
  }, [])

  return (
    <div>
      <Helmet>
        <meta name="referrer" content="no-referrer" />
        <title>{video.Title}-在线观看 下载</title>
        <meta property="og:title" content={video.Title} key="title" />
        <meta name="description" content={video.Describe} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": video.Title,
            "description": video.Describe,
            "thumbnailUrl": video.Cover,
            "uploadDate": video.CreatedAt,
            "contentUrl": video.Url,
            "embedUrl": `https://7x.chat/details?id=${video.Id}`,
            "duration": video.Duration || undefined,
            "interactionStatistic": {
              "@type": "InteractionCounter",
              "interactionType": { "@type": "WatchAction" },
              "userInteractionCount": video.ViewCount || 0
            },
            "publisher": {
              "@type": "Organization",
              "name": "YourSiteName",
              "logo": {
                "@type": "ImageObject",
                "url": "https://7x.chat/logo.png"
              }
            }
          })}
        </script>
      </Helmet>
      <div className='bg-base-300'>
        <div className={styles["video-container"]}>
          <Menu />
          <MediaPlayer
            src={streamUrl}
            viewType='video'
            streamType='on-demand'
            logLevel='warn'
            // autoPlay
            onProviderChange={onProviderChange}
            playsInline
          >
            <MediaProvider />
            <PlyrLayout thumbnails="https://files.vidstack.io/sprite-fight/thumbnails.vtt" icons={plyrLayoutIcons} />
            {/* <DefaultVideoLayout icons={defaultLayoutIcons} /> */}
          </MediaPlayer>

          {/* Video list buttons */}
          {video.VideoList && video.VideoList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {video.VideoList.map((item) => (
                <button
                  key={item.Id}
                  onClick={() => router.push(`/details?id=${item.Id}`)}
                  className={`btn btn-sm ${videoId === String(item.Id) ? 'btn-primary' : 'btn-outline'}`}
                >
                  {item.Title || `Video ${item.Id}`}
                </button>
              ))}
            </div>
          )}

          <div className='relative inset-y-3'>
            <h1 className="text-3xl font-semibold  text-base-content">{video.Title}</h1>
          </div>
          <br />
          <div className="text-base-content">
            {video.Describe}
          </div>
          <div className={styles["node-container"]} >
            <NodeNetwork peers={peers} />
          </div>
        </div>
      </div>
    </div>
  );
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