'use client';

import { useEffect } from 'react';
import { useLanguage } from './LanguageContext';

export default function MetadataUpdater() {
    const { t, language } = useLanguage();

    useEffect(() => {
        if (typeof document !== 'undefined') {
            // const suffix = t('video_title_suffix');
            // Only update if the title doesn't already end with the suffix (to avoid duplication)
            // or if we want to enforce the suffix.
            // A simple strategy is to replace the suffix if it exists, or append it.

            // However, page titles vary.
            // Let's just update the suffix part if possible, or just leave it be for now as it's complex to manage dynamic titles from client side without context of the current page content.
            // But the requirement was to support multi-language title.
            // Since we can't easily know the "current page title" without the suffix from client side (unless we parse it),
            // maybe we can just update the document title if it matches the default title, or if we are on home page.

            // Actually, a better approach for a simple requirement is:
            // If we are on the home page, set the home title.
            // For other pages, it's harder.

            // Let's at least set the document language attribute.
            document.documentElement.lang = language;
        }
    }, [language, t]);

    return null;
}
