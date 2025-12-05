'use client'

import * as React from 'react'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '../../lib/LanguageContext'
import type { VideoClassItem } from '../../lib/types'
import LanguageSwitcher from '../../../components/ui/LanguageSwitcher'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export default function Menus() {
    const { t } = useLanguage()
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeTypeId = searchParams.get('TypeId') || ''

    const [items, setItems] = useState<VideoClassItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true
        const fetchData = async () => {
            if (!API_URL) return
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`${API_URL}/api/v1/video_class/list`)
                if (!res.ok) throw new Error(t('category_loading'))
                const data: VideoClassItem[] = await res.json()
                if (mounted) setItems(Array.isArray(data) ? data : [])
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : '网络异常'
                if (mounted) setError(msg)
            } finally {
                if (mounted) setLoading(false)
            }
        }
        fetchData()
        return () => {
            mounted = false
        }
    }, [t])

    const topWithChildren = useMemo(
        () => items.filter((it) => Array.isArray(it.VideoClassSon) && it.VideoClassSon.length > 0),
        [items]
    )

    const singleItems = useMemo(
        () => items.filter((it) => !it.VideoClassSon || it.VideoClassSon.length === 0),
        [items]
    )

    const goHome = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('TypeId')
        params.set('page', '1')
        router.push(`/?${params.toString()}`)
    }, [router, searchParams])

    const onPickType = useCallback(
        (typeId: number) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('TypeId', String(typeId))
            params.set('page', '1')
            router.push(`/?${params.toString()}`)
        },
        [router, searchParams]
    )

    return (
        <div className="navbar bg-base-100  ">
            <div className="navbar-start">
                <div className="dropdown">
                    <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </div>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-64 p-2 shadow">
                        <li className={!activeTypeId ? 'menu-active' : ''}>
                            <button onClick={goHome}>{t('home')}</button>
                        </li>
                        {loading && <li className="opacity-60"><span>{t('loading')}</span></li>}
                        {error && <li className="text-error"><span>{error}</span></li>}
                        {topWithChildren.map((group) => {
                            const isGroupActive = group.VideoClassSon?.some((s) => activeTypeId === String(s.TypeId))
                            return (
                                <li key={`m-${group.Id}`} className={isGroupActive ? 'menu-active' : ''}>
                                    <details>
                                        <summary>{group.TypeName}</summary>
                                        <ul className="p-2">
                                            {group.VideoClassSon?.map((s) => (
                                                <li key={`s-${s.Id}`} className={activeTypeId === String(s.TypeId) ? 'menu-active' : ''}>
                                                    <button onClick={() => onPickType(s.TypeId)}>{s.TypeName}</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                </li>
                            )
                        })}
                        {singleItems.map((it) => (
                            <li key={`single-${it.Id}`} className={activeTypeId === String(it.TypeId) ? 'menu-active' : ''}>
                                <button onClick={() => onPickType(it.TypeId)}>{it.TypeName}</button>
                            </li>
                        ))}
                    </ul>
                </div>
                <button onClick={goHome} className={`btn btn-ghost text-xl ${!activeTypeId ? 'text-primary' : ''}`}>7x影院</button>
            </div>
            <div className="navbar-center hidden lg:flex">
                <ul className="menu menu-horizontal px-1">
                    <li>
                        <button onClick={goHome}>{t('home')}</button>
                    </li>
                    {topWithChildren.map((group) => {
                        const isGroupActive = group.VideoClassSon?.some((s) => activeTypeId === String(s.TypeId))
                        return (
                            <li key={`lg-m-${group.Id}`} className={isGroupActive ? 'menu-active' : ''}>
                                <details>
                                    <summary>{group.TypeName}</summary>
                                    <ul className="p-2">
                                        {group.VideoClassSon?.map((s) => (
                                            <li key={`lg-s-${s.Id}`} className={activeTypeId === String(s.TypeId) ? 'menu-active' : ''}>
                                                <button onClick={() => onPickType(s.TypeId)}>{s.TypeName}</button>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            </li>
                        )
                    })}
                    {singleItems.map((it) => (
                        <li key={`lg-single-${it.Id}`} className={activeTypeId === String(it.TypeId) ? 'menu-active' : ''}>
                            <button onClick={() => onPickType(it.TypeId)}>{it.TypeName}</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="navbar-end">
                <LanguageSwitcher />
            </div>
        </div>
    )
}

