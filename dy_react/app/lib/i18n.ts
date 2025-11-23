export type Language = 'zh-CN' | 'en-US';

export const languages: { [key in Language]: string } = {
    'zh-CN': '中文',
    'en-US': 'English',
};

export type TranslationKey =
    | 'home'
    | 'loading'
    | 'source'
    | 'quality'
    | 'show_player'
    | 'video_title_suffix'
    | 'video_desc_default'
    | 'category_loading'
    | 'search'
    | 'search_placeholder'
    | 'all'
    | 'collapse'
    | 'show_more';

export const translations: { [key in Language]: { [key in TranslationKey]: string } } = {
    'zh-CN': {
        home: '首页',
        loading: '加载中...',
        source: '源',
        quality: '清晰度',
        show_player: '显示播放入口',
        video_title_suffix: ' - 7x影视',
        video_desc_default: '分享好看的4k影视,在线观看,超清视频,高清视频',
        category_loading: '加载视频分类失败',
        search: '搜索',
        search_placeholder: '搜索...',
        all: '全部',
        collapse: '收起',
        show_more: '显示更多',
    },
    'en-US': {
        home: 'Home',
        loading: 'Loading...',
        source: 'Source',
        quality: 'Quality',
        show_player: 'Show Player',
        video_title_suffix: ' - 7x Movies',
        video_desc_default: 'Share good 4k movies, watch online, ultra-clear video, high-definition video',
        category_loading: 'Failed to load video categories',
        search: 'Search',
        search_placeholder: 'Search...',
        all: 'All',
        collapse: 'Collapse',
        show_more: 'Show More',
    },
};

export function getTranslation(lang: Language, key: TranslationKey): string {
    return translations[lang][key] || translations['zh-CN'][key];
}
