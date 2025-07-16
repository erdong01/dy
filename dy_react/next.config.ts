import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 注释掉 output: 'export' 以启用 API 路由支持
  output: 'export',  // 静态导出模式不支持 API 路由
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
