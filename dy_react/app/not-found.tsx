import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 - 页面未找到',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <div className="hero min-h-[70vh]">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <p className="py-6 text-2xl font-semibold">页面未找到</p>
          <p className="pb-6 text-base-content/70">抱歉，你访问的页面似乎已经迷路了。</p>
          <Link href="/" className="btn btn-primary">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
