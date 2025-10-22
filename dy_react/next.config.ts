import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // 静态导出模式不支持 API 路由
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
