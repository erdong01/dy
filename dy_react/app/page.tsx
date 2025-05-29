'use client'
import List from "@/app/ui/list/list";
import { Helmet } from 'react-helmet';
export default function Home() {

  return (
    <>
      <Helmet>
        <title>影视世界 在线播放 在线观看</title>
        <meta property="og:title" content="影视世界 在线播放 在线观看" key="title" />
        <meta name="description" content="分享好看的影视" />
      </Helmet>
      <div className="grid justify-items-center">
        <List />
      </div>
    </>
  );
}
