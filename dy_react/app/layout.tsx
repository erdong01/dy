
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import type { Metadata } from "next";
// import { Helmet } from 'react-helmet';
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "7x影视在线播放在线观看",
  description: "分享好看的影视",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html >
      {/* <Helmet>
        <title>7x影视在线播放在线观看</title>
        <meta property="og:title" content="影视世界 在线播放 在线观看" key="title" />
        <meta name="description" content="分享好看的影视" />
      </Helmet> */}
      <head>
        <Script id="theme" strategy="beforeInteractive">
          {`
            if (
              localStorage.theme === 'dark' ||
              (!('theme' in localStorage) &&
                window.matchMedia('(prefers-color-scheme: dark)').matches)
            ) {
              document.documentElement.classList.add('dark');
              document.documentElement.dataset.theme = 'dark';
            } else {
              document.documentElement.classList.remove('dark');
              document.documentElement.dataset.theme = 'cupcake';
            }
          `}
        </Script>
        <script src="https://cdn.jsdelivr.net/npm/@webtor/embed-sdk-js/dist/index.min.js" async></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
