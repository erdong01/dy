import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 注释掉 output: 'export' 以启用 API 路由支持
  // output: 'export',  // 静态导出模式不支持 API 路由
  images: {
    unoptimized: true,
  },
  // 如果需要处理跨域，可以添加以下配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Range' },
        ],
      },
    ];
  },
};

export default nextConfig;
