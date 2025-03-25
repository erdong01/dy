"use client"
import { useEffect } from 'react';
declare global {
    interface Window {
        webtor: {
            push: (arg: {
                id: string;
                magnet: string;
                baseUrl: string;
            }) => void
        };
    }
}

interface WebtorProps {
        Url: string;
}
export default function Webtor({ Url }: WebtorProps) {
    useEffect(() => {
        try {
            window.webtor = window.webtor || [];
            window.webtor.push({
                id: 'player',
                magnet: Url,
                baseUrl: 'http://96.43.98.19:9090/',
            });
        } catch (e) {
            console.error(e);
        }
    }, [Url]);
    return (
        <>
            <div id="player" className="webtor" />
        </>
    );
}