'use client';
import React, { Suspense, useEffect, useState } from 'react';
import DetailsClient from '../../components/DetailsClient';
import type { Video } from '../lib/types';
import { parseM3u8URLs } from '../lib/parseM3u8';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
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
        // HTTP 状态错误，直接回首页
        if (!res.ok) {
          router.push('/404');
          return;
        }
        // 安全解析 JSON，避免空响应导致报错
        let result: { Data: Video | null; Category: VideoCategory[] } | null = null;
        try {
          const text = await res.text();
          if (!text) {
            router.push('/');
            return;
          }
          result = JSON.parse(text);
        } catch {
          router.push('/');
          return;
        }

        const v = result?.Data;

        // 接口没有返回 Data，也回首页
        if (!v) {
          router.push('/');
          return;
        }
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

        const aliasText = v.Alias ? ` 关键词：${v.Alias}。` : '';
        const introductionDescription = sanitizedDescription
          ? `${sanitizedDescription}${aliasText}`
          : `${aliasText}`;
        document.title = `${v.Title}-在线观看`;

        // description
        let metaDesc = document.querySelector("meta[name='description']");
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', introductionDescription);

        // keywords
        let keywordsMeta = document.querySelector("meta[name='keywords']");
        if (!keywordsMeta) {
          keywordsMeta = document.createElement('meta');
          keywordsMeta.setAttribute('name', 'keywords');
          document.head.appendChild(keywordsMeta);
        }
        keywordsMeta.setAttribute('content', v.Alias || v.Title);

        // og:image
        let ogImage = document.querySelector("meta[property='og:image']");
        if (!ogImage) {
          ogImage = document.createElement('meta');
          ogImage.setAttribute('property', 'og:image');
          document.head.appendChild(ogImage);
        }
        ogImage.setAttribute('content', v.Cover || '');

        // og:keywords
        let ogKeywords = document.querySelector("meta[property='og:keywords']");
        if (!ogKeywords) {
          ogKeywords = document.createElement('meta');
          ogKeywords.setAttribute('property', 'og:keywords');
          document.head.appendChild(ogKeywords);
        }
        ogKeywords.setAttribute('content', v.Alias || v.Title);

        // og:title
        let ogTitle = document.querySelector("meta[property='og:title']");
        if (!ogTitle) {
          ogTitle = document.createElement('meta');
          ogTitle.setAttribute('property', 'og:title');
          document.head.appendChild(ogTitle);
        }
        ogTitle.setAttribute('content', `${v.Title}-在线观看`);

        // og:url
        let ogUrl = document.querySelector("meta[property='og:url']");
        if (!ogUrl) {
          ogUrl = document.createElement('meta');
          ogUrl.setAttribute('property', 'og:url');
          document.head.appendChild(ogUrl);
        }
        ogUrl.setAttribute('content', window.location.href);

        // og:description
        let ogDesc = document.querySelector("meta[property='og:description']");
        if (!ogDesc) {
          ogDesc = document.createElement('meta');
          ogDesc.setAttribute('property', 'og:description');
          document.head.appendChild(ogDesc);
        }
        ogDesc.setAttribute('content', introductionDescription);

        // og:locale
        let ogLocale = document.querySelector("meta[property='og:locale']");
        if (!ogLocale) {
          ogLocale = document.createElement('meta');
          ogLocale.setAttribute('property', 'og:locale');
          document.head.appendChild(ogLocale);
        }
        ogLocale.setAttribute('content', 'zh_CN');

        // og:locale:alternate (English)
        let ogLocaleAlt = document.querySelector("meta[property='og:locale:alternate']");
        if (!ogLocaleAlt) {
          ogLocaleAlt = document.createElement('meta');
          ogLocaleAlt.setAttribute('property', 'og:locale:alternate');
          document.head.appendChild(ogLocaleAlt);
        }
        ogLocaleAlt.setAttribute('content', 'en_US');

        // og:type
        let ogType = document.querySelector("meta[property='og:type']");
        if (!ogType) {
          ogType = document.createElement('meta');
          ogType.setAttribute('property', 'og:type');
          document.head.appendChild(ogType);
        }
        ogType.setAttribute('content', 'video.movie');
        
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id, router]);

  if (!id) {
    return <div className="flex justify-center items-center min-h-screen">缺少影片 ID</div>;
  }
  if (loading || !video) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
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
      <p className="text-xs text-gray-500 mt-4 text-center">
        本页面仅提供影片信息展示及在线播放体验和宣传作用，不存储或提供下载链接，请支持正版平台观看完整内容。如有侵权请邮箱联系:xiuming142857@outlook.com删除内容
      </p>
    </>
  );
}