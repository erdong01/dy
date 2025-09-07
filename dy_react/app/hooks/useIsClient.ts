'use client'

import { useState, useEffect } from 'react';

// 这个自定义 Hook 用来判断当前是否在客户端环境
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}