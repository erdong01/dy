// /components/CategoryFilters.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';

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
    `cursor-pointer transition-colors whitespace-nowrap ${
      isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
    }`;

  return (
    <div className="p-4 sm:p-6 bg-black text-white font-sans space-y-5">
      <div className="space-y-5">
        {categories.map(category => (
          <div key={category.Id} className="flex items-baseline gap-x-4 sm:gap-x-6">
            <div className="bg-[#1f2937] text-white px-4 py-1.5 rounded-md whitespace-nowrap text-sm sm:text-base flex-shrink-0">
              {category.Name}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 sm:gap-x-6 gap-y-3">
              <button
                onClick={() => handleFilterClick(category.Id, 'all')}
                // --- MODIFICATION 6: 使用派生出的 `activeFilters` 来判断状态 ---
                className={getFilterClasses(activeFilters[category.Id] === 'all' || !activeFilters[category.Id])}
              >
                全部
              </button>

              {category.SonCategory?.map(son => (
                <button
                  key={son.Id}
                  onClick={() => handleFilterClick(category.Id, son.Id)}
                  className={getFilterClasses(activeFilters[category.Id] === son.Id)}
                >
                  {son.Name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilters;