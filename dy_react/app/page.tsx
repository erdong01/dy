'use client'
import List from "@/app/ui/list/list";
import Menu from "@/app/ui/menu/menu";

export default function Home() {

  return (
    <>
    
      <div className="grid justify-items-center">
          <Menu />
        <List />
      </div>
    </>
  );
}
