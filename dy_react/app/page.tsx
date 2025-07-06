import List from "@/app/ui/list/list";
import Menu from "@/app/ui/menu/menu";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "7x影视-在线观看",
  description: "分享好看的影视,在线观看",
};
export default function Home() {
  return (
    <>
      <Menu />
      <div className="grid justify-items-center">
        <List />
      </div>
    </>
  );
}
