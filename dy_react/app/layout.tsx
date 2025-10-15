import Script from 'next/script';
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
 
  
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}