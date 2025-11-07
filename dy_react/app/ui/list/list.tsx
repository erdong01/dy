'use client'

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import CategoryFilters from '../../../components/CategoryMenu';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "../../../components/ui/pagination";
import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

const DOTS = '...';
const generatePagination = ({ total, pageSize, siblingCount = 1, currentPage }: { total: number; pageSize: number; siblingCount?: number; currentPage: number; }): (string | number)[] => {
    // ... (此处省略未修改的 generatePagination 函數代碼)
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


interface Video { Id: number; CreatedAt: string; UpdatedAt: string; DeletedAt: string | null; Title: string; Describe: string; Connection: number; Url: string; Cover: string; VideoGroupId: number; }
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


export default function List() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const page = Number(searchParams.get('page')) || 1;
    // --- FINAL FIX STEP 1: 从 URL 中获取 CategoryId，用于传递给子组件 ---
    const CategoryId = searchParams.get('category') || '';

    const [searchInput, setSearchInput] = useState(searchParams.get('keyword') || '');
    const [list, setList] = useState<Video[]>([]);
    const [total, setTotal] = useState(0);
    const [pageSize] = useState(30);

    // useEffect 逻辑现在是完全正确的，无需改动
    useEffect(() => {
        setSearchInput(searchParams.get('keyword') || '');
        const fetchMovies = async () => {
            if (!API_URL) return;
            const apiParams = new URLSearchParams();
            apiParams.set('Page', searchParams.get('page') || '1');
            apiParams.set('PageSize', String(pageSize));
            apiParams.set('Id', '0');
            if (searchParams.get('keyword')) apiParams.set('KeyWord', searchParams.get('keyword')!);
            if (searchParams.get('category')) apiParams.set('CategoryId', searchParams.get('category')!);
            const requestUrl = `${API_URL}/api/v1/video/list?${apiParams.toString()}`;
            console.log('Fetching data from URL:', requestUrl);
            try {
                const res = await fetch(requestUrl);
                if (!res.ok) throw new Error('Network response was not ok');
                const payload = await res.json();
                setList(payload.Data || []);
                setTotal(payload.Total || 0);
            } catch (err) {
                console.error('请求 video/list 异常:', err);
                setList([]); setTotal(0);
            }
        };
        window.scrollTo(0, 0);
        fetchMovies();
    }, [searchParams, pageSize]);

    // 操作函数的防御性检查逻辑也是正确的，无需改动
    const handleSearch = () => {
        const currentKeyword = searchParams.get('keyword') || '';
        if (searchInput !== currentKeyword) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', '1');
            if (searchInput) { params.set('keyword', searchInput); } 
            else { params.delete('keyword'); }
            router.push(`/?${params.toString()}`);
        }
    };

    const handleCategoryChange = useCallback((ids: string) => {
        const currentCategory = searchParams.get('category') || '';
        if (ids !== currentCategory) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', '1');
            if (ids) { params.set('category', ids); } 
            else { params.delete('category'); }
            router.push(`/?${params.toString()}`);
        }
    }, [router, searchParams]);

    const paginationRange = useMemo(() => {
        if (total === 0) return [];
        return generatePagination({ currentPage: page, total: total, siblingCount: 1, pageSize: pageSize });
    }, [page, total, pageSize]);

     const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(pageNumber));
        return `/?${params.toString()}`;
    };

    return (
    <>
        <CategoryFilters 
            onChange={handleCategoryChange} 
            value={CategoryId} 
        />
        <br />
        <div className="flex w-full max-w-sm items-center space-x-2 min-h-12">
            <Input 
                type="text" 
                placeholder="Search" 
                value={searchInput} 
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button type="button" onClick={handleSearch}>Search</Button>
        </div>
        <br />
        
        {/* --- (剩余的 JSX 保持不变) --- */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mx-auto">
            {list.map((item, index) => (
                <div className="card bg-base-200 w-full shadow-xl" key={item.Id}>
                    <Link href={`/details?id=${item.Id}`} target="_blank" rel="noopener noreferrer">
                        <div className="card-body">
                            <h1 className="card-title text-base-content">{item.Title}</h1>
                            <p className="bg-base-200 text-base-content" dangerouslySetInnerHTML={{ __html: item.Describe }} style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}></p>
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

        {total > pageSize && (
            <div>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href={createPageURL(page - 1)}
                                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                            />
                        </PaginationItem>

                        {paginationRange.map((pageNumber, index) => {
                            if (pageNumber === DOTS) {
                                return <PaginationItem key={`dots-${index}`} className="hidden sm:list-item"><PaginationEllipsis /></PaginationItem>;
                            }
                            return (
                                <PaginationItem key={pageNumber} className="hidden sm:list-item">
                                    <PaginationLink
                                        href={createPageURL(pageNumber)}
                                        isActive={page === pageNumber}
                                    >
                                        {pageNumber}
                                    </PaginationLink>
                                </PaginationItem>
                            );
                        })}

                        <PaginationItem className="sm:hidden">
                            <span className="px-4 text-sm font-medium">Page {page} of {Math.ceil(total / pageSize)}</span>
                        </PaginationItem>

                        <PaginationItem>
                            <PaginationNext
                                href={createPageURL(page + 1)}
                                className={page >= Math.ceil(total / pageSize) ? "pointer-events-none opacity-50" : ""}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        )}
        <br />
        <br />
    </>
    );
}