import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// 全局类型声明
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    adsbygoogle: unknown[]; // 为 AdSense 添加类型
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning data-theme="pureblack" className="dark">
      <head>
        <meta name="description" content="" />
        <meta name="google-adsense-account" content="ca-pub-3171747573136206" />
        {/* 告诉浏览器我们支持浅色/深色，减少闪白 */}
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}