// /components/CategoryFilters.tsx

'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../app/lib/LanguageContext';
import { TranslationKey } from '../app/lib/i18n';
// --- (类型定义保持不变) ---
export interface SonCategory { Id: number; CreatedAt: string; UpdatedAt: string; DeletedAt: null | string; Name: string; ParentId: number; Type: number; IsHide: null | boolean; SonCategory: null; }
export interface Category { Id: number; CreatedAt: string; UpdatedAt: string; DeletedAt: null | string; Name: string; ParentId: number; Type: number; IsHide: null | boolean; SonCategory: SonCategory[] | null; }
export interface ApiResponse { Data: Category[]; }


// --- MODIFICATION 1: Props 中增加 `value` ---
type CategoryMenuProps = {
  // `value` 是从父组件传入的当前选中的 category IDs (e.g., "123,456")
  value?: string;
  onChange?: (ids: string) => void;
};

const CategoryFilters = ({ value = '', onChange }: CategoryMenuProps) => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);

  // --- MODIFICATION 2: 移除组件自己的状态管理 ---
  // const [selectedFilters, setSelectedFilters] = useState<{ [key: number]: number | 'all' }>({}); // <-- DELETE THIS
  // const onChangeRef = useRef<CategoryMenuProps["onChange"] | null>(null); // <-- DELETE THIS

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!API_URL) return;

        const response = await fetch(`${API_URL}/api/v1/category/list`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result: ApiResponse = await response.json();
        setCategories(result.Data);
      } catch (error) {
        console.error("无法获取分类数据:", error);
      }
    };
    fetchData();
  }, []);

  // --- MODIFICATION 3: 使用 `useMemo` 从 props 派生出用于显示的状态 ---
  // 这确保了组件的显示状态总是与父组件的 `value` prop 同步
  const activeFilters = useMemo(() => {
    // 只有当分类数据加载后才进行计算
    if (categories.length === 0) return {};

    const selectedIds = new Set(value.split(',').filter(Boolean).map(Number));
    const filterMap: { [key: number]: number | 'all' } = {};

    categories.forEach(category => {
      let foundSelectedSon = false;
      if (category.SonCategory) {
        for (const son of category.SonCategory) {
          if (selectedIds.has(son.Id)) {
            filterMap[category.Id] = son.Id;
            foundSelectedSon = true;
            break;
          }
        }
      }
      if (!foundSelectedSon) {
        filterMap[category.Id] = 'all';
      }
    });
    return filterMap;
  }, [value, categories]); // 当 `value` 或 `categories` 改变时，重新计算


  // --- MODIFICATION 4: 移除触发 onChange 的 useEffect ---
  // useEffect(() => { ... }, [selectedFilters]); // <-- DELETE THIS WHOLE BLOCK


  // --- MODIFICATION 5: 修改点击处理函数 ---
  // 它不再更新本地 state，而是计算出新的 ID 字符串并直接调用 `onChange`
  const handleFilterClick = (parentId: number, sonId: number | 'all') => {
    // 复制当前激活的过滤器
    const newFilters = { ...activeFilters };
    // 更新被点击的那个分类
    newFilters[parentId] = sonId;

    // 从新的过滤器对象中计算出新的 ID 字符串
    const newIds = Object.values(newFilters)
      .filter((id): id is number => typeof id === 'number') // 只保留数字 ID
      .join(',');

    // 调用父组件的 onChange，将控制权交还给父组件
    onChange?.(newIds);
  };

  const getFilterClasses = (isActive: boolean) =>
    `cursor-pointer transition-colors whitespace-nowrap ${isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
    }`;

  return (
    <div className="p-4 sm:p-6 bg-black text-white font-sans space-y-5">
      <div className="space-y-5">
        {categories.map(category => (
          <CategoryRow
            key={category.Id}
            category={category}
            isActive={(id) => activeFilters[category.Id] === id || (!id && (activeFilters[category.Id] === 'all' || !activeFilters[category.Id]))}
            onClick={(sonId) => handleFilterClick(category.Id, sonId)}
            getFilterClasses={getFilterClasses}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryFilters;

// --- 移动端三行折叠的分类行组件 ---
type CategoryRowProps = {
  category: Category;
  // isActive: 传入函数判断按钮是否激活；当传入 id 为 undefined/null 时表示 “全部”
  isActive: (id?: number) => boolean;
  // onClick: 传入点击回调；sonId 为 'all' 或具体数字 ID
  onClick: (sonId: number | 'all') => void;
  getFilterClasses: (isActive: boolean) => string;
  t: (key: TranslationKey) => string;
};

const CategoryRow: React.FC<CategoryRowProps> = ({ category, isActive, onClick, getFilterClasses, t }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  // 监听窗口宽度，判定是否移动端（与 Tailwind sm 断点对齐：< 640px）
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 计算可见数量：仅在移动端且未展开时限制三行
  useEffect(() => {
    const calc = () => {
      const el = containerRef.current;
      if (!el) return;

      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) {
        setVisibleCount(null);
        setHasOverflow(false);
        return;
      }

      // 非移动端：显示全部且无折叠按钮
      if (!isMobile) {
        setVisibleCount(children.length);
        setHasOverflow(false);
        return;
      }

      // 移动端：统计每个子元素的 offsetTop，按行分组
      const rowTops: number[] = [];
      for (const child of children) {
        const top = child.offsetTop;
        if (!rowTops.includes(top)) rowTops.push(top);
      }
      rowTops.sort((a, b) => a - b);

      const overflow = rowTops.length > 3;

      // 三行以内无需折叠按钮
      if (!overflow) {
        setVisibleCount(children.length);
        setHasOverflow(false);
        return;
      }

      // 有溢出时：
      // - 展开：显示全部，并保留“收起”按钮
      if (expanded) {
        setVisibleCount(children.length);
        setHasOverflow(true);
        return;
      }

      // 第三行的 top 值
      const thirdTop = rowTops[2];
      let count = 0;
      for (const child of children) {
        if (child.offsetTop <= thirdTop) count++;
      }
      setVisibleCount(count);
      // 折叠状态下有溢出：需要显示“显示更多”按钮
      setHasOverflow(true);
    };

    // 下一帧计算，确保布局完成
    const id = requestAnimationFrame(calc);
    return () => cancelAnimationFrame(id);
  }, [isMobile, expanded, category]);

  const toggle = () => setExpanded(v => !v);

  return (
    <div className="flex items-baseline gap-x-4 sm:gap-x-6">
      <div className="bg-[#1f2937] text-white px-4 py-1.5 rounded-md whitespace-nowrap text-sm sm:text-base shrink-0">
        {category.Name}
      </div>
      <div className="flex-1 min-w-0">
        <div ref={containerRef} className="flex flex-wrap items-baseline gap-x-4 sm:gap-x-6 gap-y-3">
          {/* 全部 */}
          <button
            onClick={() => onClick('all')}
            className={getFilterClasses(isActive())}
          >
            {t('all')}
          </button>
          {/* 子分类 */}
          {category.SonCategory?.map((son, idx) => {
            // idx 偏移：因为前面有一个 “全部” 按钮，所以需要 +1 来与 children 对齐
            const childIndex = idx + 1;
            const hidden = isMobile && !expanded && visibleCount !== null && childIndex >= visibleCount;
            return (
              <button
                key={son.Id}
                onClick={() => onClick(son.Id)}
                className={getFilterClasses(isActive(son.Id))}
                style={hidden ? { display: 'none' } : undefined}
              >
                {son.Name}
              </button>
            );
          })}
        </div>

        {/* 切换按钮：仅在移动端且有溢出时显示 */}
        {isMobile && hasOverflow && (
          <button
            onClick={toggle}
            className="mt-3 text-sm text-gray-400 hover:text-white underline"
          >
            {expanded ? t('collapse') : t('show_more')}
          </button>
        )}
      </div>
    </div>
  );
};