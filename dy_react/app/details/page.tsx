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
  const [showPlayer, setShowPlayer] = useState<boolean>(false);
  const [shouldAutoplay, setShouldAutoplay] = useState<boolean>(false);
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
        setShowPlayer(false);
        setShouldAutoplay(false);
        if (Array.isArray(result?.Category)) {
          setCategories(result.Category);
        }


        if (v.VideoUrlArr?.length) {
          const prioritized = [
            ...v.VideoUrlArr.filter(item => item?.ProxyName === '豆瓣资源'),
            ...v.VideoUrlArr.filter(item => item?.ProxyName !== '豆瓣资源')
          ];
          v.VideoUrlArr = prioritized;

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

        const sanitizedDescription = (v.Describe || v.Title)?.replace(/<[^>]+>/g, '') || '';
        const introductionDescription = sanitizedDescription
          ? `${sanitizedDescription}。本页面仅提供影片介绍信息，不提供资源存储或下载。`
          : '本页面仅提供影片介绍信息，不提供资源存储或下载。';
        document.title = `${v.Title}-在线介绍影片`;
        let metaDesc = document.querySelector("meta[name='description']");
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', introductionDescription);

        const canonicalLink: HTMLLinkElement = document.createElement('link');

        // 2. 设置 rel 和 href 属性
        canonicalLink.rel = 'canonical';
        canonicalLink.href = `https://www.7x.chat/details?id=${v.Id}`;

        // 3. 将它添加到文档的 <head> 部分
        // document.head 是 <head> 元素的直接引用
        document.head.appendChild(canonicalLink);
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
  const sanitizedDescription = (video.Describe || video.Title)?.replace(/<[^>]+>/g, '') ?? '';
  const introductionDescription = sanitizedDescription
    ? `${sanitizedDescription}。本页面仅提供影片介绍信息，不提供资源存储或下载。`
    : '本页面仅提供影片介绍信息，不提供资源存储或下载。';
  const pageUrl = `https://www.7x.chat/details?id=${video.Id}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": pageUrl,
    "name": `${video.Title}-视频介绍页面`,
    "description": introductionDescription,
    "inLanguage": "zh-CN",
    "datePublished": new Date(video.CreatedAt).toISOString(),
    "isPartOf": {
      "@type": "WebSite",
      "@id": "https://www.7x.chat",
      "name": "7x影视"
    },
    ...(video.Cover
      ? {
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": video.Cover
        }
      }
      : {}),
    "about": {
      "@type": "Movie",
      "name": video.Title,
      "description": introductionDescription,
      "image": video.Cover || undefined,
      "dateCreated": new Date(video.CreatedAt).toISOString(),
      "keywords": video.Alias || undefined,
      "interactionStatistic": {
        "@type": "InteractionCounter",
        "interactionType": { "@type": "WatchAction" },
        "userInteractionCount": video.Browse || 0
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "7x影视",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.7x.chat/logo.png"
      }
    }
  };
  return (
    <>
      <ReactSuspense fallback={<div className="navbar bg-base-100 border-b px-4 h-16" />}>
        <Menus />
      </ReactSuspense>
      <DetailsClient
        initialVideo={video}
        initialStreamUrl={initialStreamUrl}
        initialVideoIdx={String(initialIdx)}
        categories={categories}
        showPlayer={showPlayer}
        autoPlay={shouldAutoplay}
        onRevealPlayer={() => {
          setShowPlayer(true);
          setShouldAutoplay(true);
        }}
      />
      <Script
        id="movie-json-ld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
    </>
  );
}