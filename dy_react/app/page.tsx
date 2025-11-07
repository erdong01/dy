import { Suspense } from 'react'; // 1. 从 'react' 导入 Suspense
import List from "./ui/list/list";
import Menu from "./ui/menu/menus";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "7x影视-在线观看",
  description: "分享好看的4k影视,在线观看,7x影院包含4k视频、超清视频、高清视频。",
};

/**
 * 这是一个“骨架屏”加载组件。
 * 在 List 组件（它需要客户端信息）加载完成之前，会先向用户显示这个 UI。
 * 这可以提升用户体验，并解决构建时错误。
 */
function ListSkeleton() {
  // 创建一个数组来渲染多个骨架卡片
  const skeletonItems = Array.from({ length: 10 });

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4">
      {/* 模拟搜索框的骨架 */}
      <div className="flex w-full max-w-sm items-center space-x-2 min-h-12 my-4">
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
      
      {/* 模拟视频卡片网格的骨架 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {skeletonItems.map((_, index) => (
          <div key={index} className="card bg-base-200 w-full shadow-xl animate-pulse">
            <div className="card-body">
              <div className="h-6 w-3/4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-4 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <div className="relative w-full pt-[125%] bg-gray-300 dark:bg-gray-600"></div>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function Home() {
  return (
    <>
      <Menu />
      <div className="grid justify-items-center">
        {/* 2. 将 List 组件用 Suspense 包裹 */}
        <Suspense fallback={<ListSkeleton />}>
          <List />
        </Suspense>
      </div>
    </>
  );
}