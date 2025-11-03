import type { PlaybackURL } from './types';

// 解析包含影片播放源的特定格式字符串，通用函数（可在服务端与客户端使用）
export function parseM3u8URLs(input: string): PlaybackURL[] {
  const relevantPart = input.split('$$$').pop() || '';
  if (!relevantPart) return [];
  const entries = relevantPart.split('#');
  return entries
    .map(entry => {
      const [name, url] = entry.split('$', 2);
      if (name && url) {
        return { Name: name.trim(), Url: url.trim() };
      }
      return null;
    })
    .filter((item): item is PlaybackURL => item !== null && item.Url.endsWith('.m3u8'));
}
