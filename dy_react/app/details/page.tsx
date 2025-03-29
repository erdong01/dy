'use client'
import Hls from "hls.js";
import { HlsJsP2PEngine } from "p2p-media-loader-hlsjs";
import Plyr, { Options } from "plyr";
import { useEffect, useRef } from "react";
const options: VideoElementsOptions = {}
const {
    videoId = "player",
    videoClassName = "",
    containerClassName = "video-container",
    playIsInline = true,
    autoplay = true,
    muted = true,
    aspectRatio = null,
} = options;
interface VideoElementsOptions {
    videoId?: string;
    videoClassName?: string;
    containerClassName?: string;
    playIsInline?: boolean;
    autoplay?: boolean;
    muted?: boolean;
    aspectRatio?: string | null;
}
export default function Details() {
    const streamUrl = "https://vodcnd01.oiods.com/20250328/MwMI5ap7/index.m3u8";
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!containerRef.current || !Hls.isSupported()) return;

        let player: Plyr | undefined;
        const HlsWithP2P = HlsJsP2PEngine.injectMixin(Hls);
        const hls = new HlsWithP2P({})
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
        const videoContainer = document.createElement("div");
        videoContainer.className = containerClassName;
        const videoElement = document.createElement("video");
        videoContainer.appendChild(videoElement);
        videoElement.className = videoClassName;
        videoElement.id = videoId;
        videoElement.playsInline = playIsInline;
        videoElement.autoplay = autoplay;
        videoElement.muted = muted;
        if (aspectRatio) {
            videoElement.style.aspectRatio = aspectRatio;
        }
        hls.attachMedia(videoElement);
        hls.loadSource(streamUrl);
        return () => {
            player?.destroy();
            videoContainer.remove();
            hls.destroy();
        };
    }, []);
    return (<>
        <h1>details</h1>

        <div ref={containerRef} />
    </>);
};