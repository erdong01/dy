'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Script from 'next/script';
import DetailsClient from '../../components/DetailsClient';
import type { Video } from '../lib/types';
import { parseM3u8URLs } from '../lib/parseM3u8';
import { useSearchParams } from 'next/navigation';
import Menus from '../ui/menu/menus';
import { Suspense as ReactSuspense } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.7x.chat';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <DetailsPageInner />
    </Suspense>
  );
}

function DetailsPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [video, setVideo] = useState<Video | null>(null);
  const [initialStreamUrl, setInitialStreamUrl] = useState<string>('');
  const [initialIdx, setInitialIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  // Category 数据（按父类分组，每个父类的 SonCategory 只包含与该视频相关的子类）
  type VideoCategory = {
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
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/video/get?Id=${id}`);
        if (!res.ok) return;
        const result: { Data: Video; Category: VideoCategory[] } = await res.json();
        const v = result?.Data;
        if (!v) return;
        setVideo(v);
        if (Array.isArray(result?.Category)) {
          setCategories(result.Category);
        }
        if (v.VideoUrlArr?.length) {
          for (const i in v.VideoUrlArr) {
            v.VideoUrlArr[i].PlaybackURL = parseM3u8URLs(v.VideoUrlArr[i].Url);
          }
          if (v.VideoUrlArr[0]?.PlaybackURL?.length) {
            setInitialStreamUrl(v.VideoUrlArr[0].PlaybackURL[0].Url);
            setInitialIdx(0);
          } else {
            setInitialStreamUrl(v.Url);
          }
        } else {
          setInitialStreamUrl(v.Url);
        }

        document.title = `${v.Title}-在线观看-下载`;
        let metaDesc = document.querySelector("meta[name='description']");
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', v.Describe?.replace(/<[^>]+>/g, '') || '影片详情');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  if (!id) {
    return <div className="flex justify-center items-center min-h-screen">缺少影片 ID</div>;
  }
  if (loading || !video) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <Script
        id="movie-json-ld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": video.Title,
            "description": video.Describe || video.Title,
            "thumbnailUrl": video.Cover,
            "uploadDate": video.CreatedAt,
            "contentUrl": video.Url,
            "keywords": video.Alias,
            "embedUrl": `https://www.7x.chat/details?id=${video.Id}`,
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
                "url": "https://www.7x.chat/logo.png"
              }
            }
          })
        }}
      />
      <ReactSuspense fallback={<div className="navbar bg-base-100 border-b px-4 h-16" />}> 
        <Menus />
      </ReactSuspense>
      <DetailsClient initialVideo={video} initialStreamUrl={initialStreamUrl} initialVideoIdx={String(initialIdx)} categories={categories} />
    </>
  );
}