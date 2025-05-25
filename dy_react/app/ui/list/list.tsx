'use client'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import Link from 'next/link';
import { useEffect, useState } from 'react';
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

export default function List() {
    const [list, setList] = useState<Video[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(30);
    const [KeyWord, setKeyWord] = useState("");
    const [total, setTotal] = useState(0);
    useEffect(() => {
        const fetchMovies = async () => {
            const data = await fetch(`${API_URL}/api/v1/video/list?Page=${page}&PageSize=${pageSize}&Id=0&KeyWord=${KeyWord}`);
            if (!data.ok) {
                console.log(data.status);
                return;
            }
            const videoList: { Data: Video[]; Total: number } = await data.json();
            setList(videoList.Data);
            setTotal(videoList.Total);
            console.log("list:", videoList.Data);
        };
        fetchMovies();
    }, [page, pageSize, KeyWord]);

 
    return (<>
        <br />
        <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" placeholder="Search" value={KeyWord} onChange={(e) => setKeyWord(e.target.value)} />
            <Button type="submit" onClick={() => setPage(1)}>Search</Button>
        </div>
        <br />
        <div className="grid grid-cols-4 gap-4 mx-auto">
            {list.map((item, index) => (
                <div className="card bg-base-200 w-96 shadow-xl" key={index}>
                    <Link href={`/details?id=${item.Id}`}>
                        <div className="card-body">
                            <h1 className="card-title   text-base-content">{item.Title}</h1>
                            <p className="bg-base-180 text-base-content"
                                style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {item.Describe}
                            </p>
                        </div>
                        {
                            item.Cover ? (
                                <figure>
                                    <img
                                        src={item.Cover}
                                        alt={item.Title}
                                        width={320}
                                        height={180}
                                        className="object-cover"
                                    />
                                </figure>
                            ) : null
                        }
                    </Link>
                </div>

            ))}
        </div>
        <br />
        <div>
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }} />
                    </PaginationItem>
                    {[...Array(Math.ceil(total / pageSize))].map((_, i) => (
                        <PaginationItem key={i}>
                            <PaginationLink
                                href="#"
                                isActive={page === i + 1}
                                onClick={(e) => { e.preventDefault(); setPage(i + 1); }}
                            >
                                {i + 1}
                            </PaginationLink>
                        </PaginationItem>
                    ))}
                    <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (page < Math.ceil(total / pageSize)) setPage(page + 1); }} />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    </>)
}