import Script from "next/script";

import "./globals.css";
import { LanguageProvider } from "./lib/LanguageContext";
import MetadataUpdater from "./lib/MetadataUpdater";

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
    <html lang="zh-CN" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="7x影视 - 免费在线观看高清电影、电视剧、综艺节目。提供最新最全的影视资源，无需下载即可流畅播放。" />
        <meta name="keywords" content="免费电影,在线观看,高清电影,电视剧,综艺节目,7x影视" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />
        <meta name="google-adsense-account" content="ca-pub-3171747573136206" />
        <Script id="baidu-analytics" strategy="beforeInteractive" type="text/javascript">
          {`
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?2c002fed0f6fcbbac0c12438af3e5895";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();
`}
        </Script>


        <Script src="https://www.googletagmanager.com/gtag/js?id=G-JRQEPBZ35T" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-JRQEPBZ35T');
`}
        </Script>
      </head>
      <body>
        <LanguageProvider>
          <MetadataUpdater />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}