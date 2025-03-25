"use client"
import Hls from 'hls.js';
import { HlsJsP2PEngine } from 'p2p-media-loader-hlsjs';
import Plyr, { Options } from "plyr";
import { useEffect, useRef } from 'react';
import { PlayerProps } from "./types";
import { createVideoElements } from "./utils";


export const HlsjsPlayer = ({
  streamUrl,
  announceTrackers,
  swarmId,
  onPeerConnect,
  onPeerClose,
  onChunkDownloaded,
  onChunkUploaded,
}: PlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!containerRef.current || !Hls.isSupported()) return;
    let player: Plyr | undefined;

    const { videoContainer, videoElement } = createVideoElements();

    containerRef.current.appendChild(videoContainer);

    const HlsWithP2P = HlsJsP2PEngine.injectMixin(Hls);
    
    const hls = new HlsWithP2P({
      p2p: {
        core: {
          announceTrackers,
          swarmId,
        },
        onHlsJsCreated(hls) {
          hls.p2pEngine.addEventListener("onPeerConnect", (params) => {
            console.log("Peer connected:", params.peerId);
        });
        hls.p2pEngine.addEventListener("onPeerClose", (params) => {
            console.log("Peer disconnected:", params.peerId);
        });
        hls.p2pEngine.addEventListener("onSegmentLoaded", (params) => {
            console.log("Segment loaded:", params);
        });
        hls.p2pEngine.addEventListener("onSegmentError", (params) => {
            console.error("Error loading segment:", params);
        });
        },
      },
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const { levels } = hls;

      const quality: Options["quality"] = {
        default: levels[levels.length - 1].height,
        options: levels.map((level) => level.height),
        forced: true,
        onChange: (newQuality: number) => {
          levels.forEach((level, levelIndex) => {
            if (level.height === newQuality) {
              hls.currentLevel = levelIndex;
            }
          });
        },
      };

      player = new Plyr(videoElement, {
        quality,
        autoplay: true,
        muted: true,
      });
    });

    hls.attachMedia(videoElement);
    hls.loadSource(streamUrl);

    return () => {
      player?.destroy();
      videoContainer.remove();
      hls.destroy();
    };
  }, [
    announceTrackers,
    onChunkDownloaded,
    onChunkUploaded,
    onPeerConnect,
    onPeerClose,
    streamUrl,
    swarmId,
  ]);

 

  return Hls.isSupported() ? (
    <div ref={containerRef} />
  ) : (
    <div className="error-message">
      <h3>HLS is not supported in this browser</h3>
    </div>
  );
};