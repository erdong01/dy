import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import "./globals.css";

// 全局类型声明
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args:unknown[]) => void;
    adsbygoogle: unknown[]; // 为 AdSense 添加类型
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta name="description" content="" />
        <meta name="google-adsense-account" content="ca-pub-3171747573136206" />

        <Script id="theme" strategy="beforeInteractive">
          {`
            document.documentElement.classList.add('dark');
            document.documentElement.dataset.theme = 'pureblack';
          `}
        </Script>

        {/* -- 修正部分开始 -- */}
        {/* 1. 将所有 <script> 替换为 <Script> */}
        <Script
          async
          src="https://cdn.jsdelivr.net/npm/@webtor/embed-sdk-js/dist/index.min.js"
          strategy="afterInteractive"
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3171747573136206"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-C5RMP72FF0`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-C5RMP72FF0', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        {/* -- 修正部分结束 -- */}
        <script async custom-element="amp-ad" src="https://cdn.ampproject.org/v0/amp-ad-0.1.js"></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}