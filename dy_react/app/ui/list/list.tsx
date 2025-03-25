
'use client'
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
    useEffect(() => {
        const fetchMovies = async () => {
            const data = await fetch('http://127.0.0.1:9090/api/v1/video/list?Page=1&PageSize=10&Id=0');
            if (!data.ok) {
                console.log(data.status)
                return
            }
            const videoList: { Data: Video[] } = await data.json();
            setList(videoList.Data)
            console.log("list:", videoList.Data);
        }
        fetchMovies()
    }, [])

    // const posts = await data.json();
    // console.log(posts);
    return (<>
        <div className="grid grid-cols-4 gap-4 mx-auto">
            {list.map((item, index) => (

                <div className="card bg-base-100 w-96 shadow-xl" key={index}>
                    <Link href={`/details?id=${item.Id}`}>
                        <div className="card-body">
                            <h2 className="card-title">{item.Title}</h2>
                            <p>{item.Describe}</p>
                        </div>
                        {
                            item.Cover ? (
                                <figure>
                                    <img
                                        src={item.Cover}
                                        alt="Shoes" />
                                </figure>
                            ) : null
                        }
                    </Link>
                </div>

            ))}
        </div>

    </>)
}