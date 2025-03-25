'use client'
import { HlsjsPlayer } from "@/app/ui/hls/hls";
// import Webtor from "@/app/ui/webtor/webtor";
import { DownloadStats, PlayerKey } from "@/app/ui/hls/types";
import { useSearchParams } from 'next/navigation';
import { PeerDetails } from "p2p-media-loader-core";
import { HlsJsP2PEngine } from "p2p-media-loader-hlsjs";
import { useCallback, useEffect, useRef, useState } from 'react';

import { PLAYERS } from "@/app/ui/hls/constants";
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
const playerComponents = {
 
  hlsjs_hls: HlsjsPlayer,
 
} as const;
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
}
export default function Page() {
  const [details, setList] = useState<Video>();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id');
    // 定义P2P追踪服务器列表
    const trackers = [
      "wss://tracker.openwebtorrent.com",
      "wss://tracker.btorrent.xyz",
      "wss://tracker.webtorrent.io"
    ];
    const data = useRef<DownloadStats>({
      httpDownloaded: 0,
      p2pDownloaded: 0,
      p2pUploaded: 0,
    });
    const [peers, setPeers] = useState<string[]>([]);
    const PlayerComponent = playerComponents[
      queryParams.player as PlayerKey
    ] as (typeof playerComponents)[PlayerKey] | undefined;

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
  
    const onPeerConnect = useCallback((params: PeerDetails) => {
      if (params.streamType !== "main") return;
  
      setPeers((peers) => {
        return [...peers, params.peerId];
      });
    }, []);
  
    const onPeerClose = useCallback((params: PeerDetails) => {
      if (params.streamType !== "main") return;
  
      setPeers((peers) => {
        return peers.filter((peer) => peer !== params.peerId);
      });
    }, []);
  
    const handlePlaybackOptionsUpdate = (url: string, player: string) => {
      if (!(player in PLAYERS)) return;
    };
  useEffect(() => {
    const fetchMovies = async () => {
      const data = await fetch(`http://127.0.0.1:9090/api/v1/video/get?Id=${videoId}`);
      if (!data.ok) {
        console.log(data.status)
        return
      }

      console.log("data:")
      const videoList: { Data: Video } = await data.json();
      setList(videoList.Data)
    }
    fetchMovies()
  }, [videoId])
  return PlayerComponent ? (
    <>
    <PlayerComponent
      streamUrl={details.Url} 
      announceTrackers={trackers}
      swarmId={"112312"}
      onPeerConnect={onPeerConnect}
      onPeerClose={onPeerClose}
      onChunkDownloaded={onChunkDownloaded}
      onChunkUploaded={onChunkUploaded}
    />
    {peers} 
    </>
  ) : null;
}