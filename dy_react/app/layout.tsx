import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "7x影视",
  description: "分享好看的影视",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <Script id="theme" strategy="beforeInteractive">
          {`
            document.documentElement.classList.add('dark');
            document.documentElement.dataset.theme = 'pureblack';
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
