'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react'; // 确保引入 useMemo
import Image from 'next/image';

// --- 1. 分页逻辑函数 ---
const DOTS = '...';

const generatePagination = ({
    total,
    pageSize,
    siblingCount = 1,
    currentPage
}: {
    total: number;
    pageSize: number;
    siblingCount?: number;
    currentPage: number;
}): (string | number)[] => {
    const totalPageCount = Math.ceil(total / pageSize);

    const totalPageNumbers = siblingCount + 5;
    if (totalPageNumbers >= totalPageCount) {
        return Array.from({ length: totalPageCount }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPageCount);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;

    if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + 2 * siblingCount;
        const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
        return [...leftRange, DOTS, totalPageCount];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + 2 * siblingCount;
        const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPageCount - rightItemCount + 1 + i);
        return [firstPageIndex, DOTS, ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
        const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
        return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }

    return [];
};


// --- 组件定义 ---
interface Video {
    Id: number;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
    Title: string;
    Describe: string;
    Connection: number;
    Url: string;
    Cover: string;
    VideoGroupId: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function List() {
    const [list, setList] = useState<Video[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(30);
    const [KeyWord, setKeyWord] = useState("");
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchMovies = async () => {
            if (!API_URL) return;
            const data = await fetch(`${API_URL}/api/v1/video/list?Page=${page}&PageSize=${pageSize}&Id=0&KeyWord=${KeyWord}`);
            if (!data.ok) {
                console.log(data.status);
                return;
            }
            const videoList: { Data: Video[]; Total: number } = await data.json();
            setList(videoList.Data);
            setTotal(videoList.Total);
        };
        window.scrollTo(0, 0);
        fetchMovies();
    }, [page, pageSize, KeyWord]);

    // --- 2. 计算 paginationRange (这是之前缺失的部分) ---
    const paginationRange = useMemo(() => {
        if (total === 0) return [];
        return generatePagination({
            currentPage: page,
            total: total,
            siblingCount: 1,
            pageSize: pageSize
        });
    }, [page, total, pageSize]);

    // 如果总条目数不足一页，则不显示分页组件
    if (total <= pageSize) {
        return null;
    }

    return (<>
        <br />
        <div className="flex w-full max-w-sm items-center space-x-2 min-h-12">
            <Input type="text" placeholder="Search" value={KeyWord} onChange={(e) => setKeyWord(e.target.value)} />
            <Button type="submit" onClick={() => setPage(1)}>Search</Button>
        </div>
        <br />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mx-auto">
            {list.map((item, index) => (
                <div className="card bg-base-200 w-full shadow-xl" key={item.Id}>
                    <Link href={`/details?id=${item.Id}`} target="_blank" rel="noopener noreferrer">
                        <div className="card-body">
                            <h1 className="card-title text-base-content">{item.Title}</h1>
                            <p className="bg-base-180 text-base-content" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.Describe}
                            </p>
                        </div>
                        {item.Cover && (
                            <figure className="relative w-full pt-[125%]">
                                <Image src={item.Cover} alt={item.Title} fill sizes="(max-width: 768px) 100vw, 20vw" className="object-contain" priority={index === 0} />
                            </figure>
                        )}
                        <br />
                    </Link>
                </div>
            ))}
        </div>
        <br />

        {/* --- 3. 响应式的分页 JSX --- */}
        <div>
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                            className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>

                    {/* 桌面端 (sm及以上) 显示完整的页码 */}
                    <div className="hidden sm:flex sm:items-center">
                        {paginationRange.map((pageNumber, index) => {
                            if (pageNumber === DOTS) {
                                return <PaginationItem key={`dots-${index}`}><PaginationEllipsis /></PaginationItem>;
                            }
                            return (
                                <PaginationItem key={pageNumber}>
                                    <PaginationLink href="#" isActive={page === pageNumber} onClick={(e) => { e.preventDefault(); setPage(Number(pageNumber)); }}>
                                        {pageNumber}
                                    </PaginationLink>
                                </PaginationItem>
                            );
                        })}
                    </div>

                    {/* 移动端 (小于sm) 只显示页数 */}
                    <PaginationItem className="sm:hidden">
                        <span className="px-4 text-sm font-medium">
                            Page {page} of {Math.ceil(total / pageSize)}
                        </span>
                    </PaginationItem>

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={(e) => { e.preventDefault(); if (page < Math.ceil(total / pageSize)) setPage(page + 1); }}
                            className={page >= Math.ceil(total / pageSize) ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
        <br />
        <br />
    </>);
}