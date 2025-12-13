'use client'

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import CategoryFilters from '../../../components/CategoryMenu';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../lib/LanguageContext';

interface Video { Id: number; CreatedAt: string; UpdatedAt: string; DeletedAt: string | null; Title: string; Describe: string; Connection: number; Url: string; Cover: string; VideoGroupId: number; }
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function List() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();

    // 分类（旧的 CategoryId）保留，新增 TypeId 支持
    const CategoryId = searchParams.get('category') || '';
    const TypeId = searchParams.get('TypeId') || '';

    const [searchInput, setSearchInput] = useState(searchParams.get('keyword') || '');
    const [list, setList] = useState<Video[]>([]);
    const [total, setTotal] = useState(0);
    const [pageSize] = useState(30);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // 上拉刷新相关
    const [pullStartY, setPullStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // 获取数据的函数
    const fetchMovies = useCallback(async (page: number, isRefresh: boolean = false) => {
        if (!API_URL) return;
        if (isLoading) return;

        setIsLoading(true);
        if (isRefresh) setIsRefreshing(true);

        const apiParams = new URLSearchParams();
        apiParams.set('Page', String(page));
        apiParams.set('PageSize', String(pageSize));
        apiParams.set('Id', '0');
        if (searchParams.get('keyword')) apiParams.set('KeyWord', searchParams.get('keyword')!);
        if (searchParams.get('category')) apiParams.set('CategoryId', searchParams.get('category')!);
        if (TypeId) apiParams.set('TypeId', TypeId);

        const requestUrl = `${API_URL}/api/v1/video/list?${apiParams.toString()}`;
        console.log('Fetching data from URL:', requestUrl);

        try {
            const res = await fetch(requestUrl);
            if (!res.ok) throw new Error('Network response was not ok');
            const payload = await res.json();
            const newData = payload.Data || [];
            const totalCount = payload.Total || 0;

            setTotal(totalCount);
            setHasMore(page * pageSize < totalCount);

            if (isRefresh) {
                setList(newData);
                setCurrentPage(1);
            } else {
                setList(prev => page === 1 ? newData : [...prev, ...newData]);
            }
        } catch (err) {
            console.error('请求 video/list 异常:', err);
            if (isRefresh || page === 1) {
                setList([]);
                setTotal(0);
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setPullDistance(0);
        }
    }, [pageSize, searchParams, TypeId, isLoading]);

    // 初始加载和搜索参数变化时重新加载
    useEffect(() => {
        setSearchInput(searchParams.get('keyword') || '');
        setList([]);
        setCurrentPage(1);
        setHasMore(true);
        fetchMovies(1, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, TypeId]);

    // 无限滚动 - 使用 IntersectionObserver 检测底部
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading && list.length > 0) {
                    const nextPage = currentPage + 1;
                    setCurrentPage(nextPage);
                    fetchMovies(nextPage, false);
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [currentPage, hasMore, isLoading, list.length, fetchMovies]);

    // 上拉刷新 - 触摸事件处理
    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            setPullStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (pullStartY === 0) return;
        const currentY = e.touches[0].clientY;
        const distance = currentY - pullStartY;
        if (distance > 0 && window.scrollY === 0) {
            setPullDistance(Math.min(distance * 0.5, 100)); // 限制最大下拉距离
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > 60) {
            // 触发刷新
            setList([]);
            setCurrentPage(1);
            setHasMore(true);
            fetchMovies(1, true);
        } else {
            setPullDistance(0);
        }
        setPullStartY(0);
    };

    // 搜索处理
    const handleSearch = () => {
        const currentKeyword = searchParams.get('keyword') || '';
        if (searchInput !== currentKeyword) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('page'); // 移除 page 参数，使用无限滚动
            if (searchInput) { params.set('keyword', searchInput); }
            else { params.delete('keyword'); }
            router.push(`/?${params.toString()}`);
        }
    };

    const handleCategoryChange = useCallback((ids: string) => {
        const currentCategory = searchParams.get('category') || '';
        if (ids !== currentCategory) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('page'); // 移除 page 参数
            if (ids) { params.set('category', ids); }
            else { params.delete('category'); }
            router.push(`/?${params.toString()}`);
        }
    }, [router, searchParams]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* 上拉刷新指示器 */}
            <div
                className="flex items-center justify-center overflow-hidden transition-all duration-200"
                style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
            >
                <div className="flex items-center gap-2 text-base-content/70">
                    {isRefreshing ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span>
                            <span>正在刷新...</span>
                        </>
                    ) : pullDistance > 60 ? (
                        <span>松开刷新</span>
                    ) : (
                        <span>下拉刷新</span>
                    )}
                </div>
            </div>

            <CategoryFilters
                onChange={handleCategoryChange}
                value={CategoryId}
                typeId={TypeId}
            />
            <br />
            <div className="flex w-full max-w-sm items-center space-x-2 min-h-12">
                <Input
                    type="text"
                    placeholder={t('search_placeholder')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button type="button" onClick={handleSearch}>{t('search')}</Button>
            </div>
            <br />

            {/* 视频列表 */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mx-auto">
                {list.map((item, index) => (
                    <div className="card bg-base-200 w-full shadow-xl" key={`${item.Id}-${index}`}>
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

            {/* 加载更多 / 底部提示 */}
            <div ref={loadMoreRef} className="py-8 flex flex-col items-center justify-center">
                {isLoading && !isRefreshing && (
                    <div className="flex items-center gap-2 text-base-content/70">
                        <span className="loading loading-spinner loading-md"></span>
                        <span>加载中...</span>
                    </div>
                )}
                {!isLoading && !hasMore && list.length > 0 && (
                    <div className="flex flex-col items-center gap-2 text-base-content/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-[1px] bg-base-content/20"></div>
                            <span className="text-sm">已到底部</span>
                            <div className="w-12 h-[1px] bg-base-content/20"></div>
                        </div>
                        <span className="text-xs">共 {total} 条，{totalPages} 页</span>
                    </div>
                )}
                {!isLoading && list.length === 0 && !isRefreshing && (
                    <div className="text-base-content/50 text-center py-8">
                        暂无数据
                    </div>
                )}
            </div>
            <br />
        </div>
    );
}