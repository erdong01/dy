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
        {/* 声明支持的语言版本 */}
        <link rel="alternate" hrefLang="zh-CN" href="https://www.7x.chat" />
        <link rel="alternate" hrefLang="en-US" href="https://www.7x.chat" />
        <link rel="alternate" hrefLang="x-default" href="https://www.7x.chat" />
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