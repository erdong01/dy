// 文件路径: app/api/proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

/**
 * 将此路由配置为在 Edge Runtime 上运行。
 * Edge Runtime 更轻量，专为低延迟场景（如代理）优化，性能更好。
 * 它运行在全球 Vercel 的边缘节点上，离你的用户更近。
 */
export const runtime = 'edge';

// 处理 CORS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  // 添加调试日志
  console.log('代理请求接收到:', request.url);
  
  // 1. 从客户端请求中获取目标视频 URL
  const { searchParams } = new URL(request.url);
  const originalUrl = searchParams.get('url');

  console.log('解析出的目标URL:', originalUrl);

  if (!originalUrl) {
    console.log('错误：缺少URL参数');
    return new NextResponse('缺少 "url" 查询参数', { status: 400 });
  }

  // 验证URL格式
  try {
    new URL(originalUrl);
  } catch {
    console.log('错误：无效的URL格式:', originalUrl);
    return new NextResponse('无效的URL格式', { status: 400 });
  }

  try {
    // 2. 在 Vercel 服务器上向目标 URL 发起请求
    const response = await fetch(originalUrl, {
      // 最好也转发一下原始请求的一些头信息，或者伪装成浏览器
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        // 'Referer': new URL(originalUrl).origin, // 使用目标源作为 Referer
      },
    });


    // 如果请求失败，将错误信息直接返回给客户端
    if (!response.ok) {
      console.log('目标服务器请求失败:', response.status);
      return new NextResponse(`目标服务器错误: ${response.status} ${response.statusText}`, { 
        status: response.status,
        statusText: response.statusText,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // 创建一个新的响应头，并设置关键的 CORS 策略
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Range');

    // 3. 【核心逻辑】检查文件类型是否为 m3u8 播放列表
    if (contentType.includes('mpegurl')) {
      // 读取 m3u8 文件内容为文本
      const m3u8Text = await response.text();
      const baseUrl = new URL(originalUrl);

      const lines = m3u8Text.split('\n');
      // 逐行扫描并重写 URL
      const rewrittenLines = lines.map(line => {
        // 如果行不为空且不是注释，我们认为它可能是一个 URL
        if (line.trim() && !line.startsWith('#')) {
          // 将相对路径或绝对路径的 .ts 文件 URL 转换为完整的 URL
          const segmentUrl = new URL(line, baseUrl.href).href;
          // 然后将这个完整的 URL 重写，让它再次指向我们自己的代理接口
          return `/api/proxy?url=${encodeURIComponent(segmentUrl)}`;
        }
        return line;
      });
      
      const rewrittenM3u8 = rewrittenLines.join('\n');
      
      // 返回修改后的 m3u8 文件内容
      return new NextResponse(rewrittenM3u8, { headers });
    } else {
      // 4. 如果不是 m3u8 文件 (例如是 .ts 视频片段)，则直接将内容流式转发
      return new NextResponse(response.body, { headers });
    }

  } catch (error) {
    console.error('代理请求出错:', error);
    return new NextResponse('代理服务器内部错误。', { status: 500 });
  }
}