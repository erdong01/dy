// src/app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

// WritableStream 的导入已被移除

export async function GET(request: NextRequest) {
  // ... 函数的其余部分保持完全不变 ...
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('URL parameter is missing', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Referer: new URL(targetUrl).origin,
      },
    });

    if (!response.ok) {
      return new NextResponse(response.statusText, { status: response.status });
    }

    if (targetUrl.endsWith('.m3u8')) {
      let m3u8Content = await response.text();
      const targetBaseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      m3u8Content = m3u8Content.replace(/^(?!#)(.*\.ts)$/gm, (match) => {
        const absoluteUrl = new URL(match, targetBaseUrl).toString();
        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      });
      m3u8Content = m3u8Content.replace(/^(https?:\/\/.+\.ts)$/gm, (match) => {
         return `/api/proxy?url=${encodeURIComponent(match)}`;
      });
       m3u8Content = m3u8Content.replace(/(URI=")([^"]+)/g, (match, p1, p2) => {
         const absoluteUrl = new URL(p2, targetBaseUrl).toString();
         return `${p1}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      });

      const headers = new Headers({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      });

      return new NextResponse(m3u8Content, { headers });

    } else {
       const { readable, writable } = new TransformStream();
       response.body?.pipeTo(writable);

       const headers = new Headers(response.headers);
       headers.set('Access-Control-Allow-Origin', '*');

       return new NextResponse(readable, { headers });
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Error fetching the content', { status: 500 });
  }
}