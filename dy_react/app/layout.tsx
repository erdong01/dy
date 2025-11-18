import Script from "next/script";

import "./globals.css";

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
    <html data-theme="dark">
      <head>
        <meta name="description" content="" />
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


        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-JRQEPBZ35T"></Script>
        <Script id="google-analytics" strategy="beforeInteractive" type="text/javascript">
          {`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-JRQEPBZ35T');
`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}