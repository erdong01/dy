"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // 同步 DaisyUI 的 data-theme，保证 DaisyUI 组件跟随浅色/深色主题
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;

    // 监听 next-themes 在 <html> 上设置的 class（light/dark）
    const observer = new MutationObserver(() => {
      const isDark = root.classList.contains("dark");
      root.setAttribute("data-theme", isDark ? "pureblack" : "light");
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    // 初始化一次，避免首次加载不同步
    const isDark = root.classList.contains("dark");
    root.setAttribute("data-theme", isDark ? "pureblack" : "light");

    return () => observer.disconnect();
  }, []);

  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  );
}
