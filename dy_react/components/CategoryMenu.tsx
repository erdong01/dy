// /components/CategoryFilters.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';

// 类型定义（与您提供的一致）
export interface SonCategory {
  Id: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: null | string;
  Name: string;
  ParentId: number;
  Type: number;
  IsHide: null | boolean;
  SonCategory: null;
}

export interface Category {
  Id: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: null | string;
  Name: string;
  ParentId: number;
  Type: number;
  IsHide: null | boolean;
  SonCategory: SonCategory[] | null;
}

export interface ApiResponse {
  Data: Category[];
}

// 向父组件回传选中二级分类ID（逗号分隔）的回调
type CategoryMenuProps = {
  onChange?: (ids: string) => void;
};

const CategoryFilters = ({ onChange }: CategoryMenuProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<{ [key: number]: number | 'all' }>({});
  const onChangeRef = useRef<CategoryMenuProps["onChange"] | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!API_URL) {
          console.error("API base URL is not configured in environment variables.");
          return;
        }
        
        const response = await fetch(`${API_URL}/api/v1/category/list`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse = await response.json();
        setCategories(result.Data);

        const initialFilters: { [key: number]: 'all' } = {};
        result.Data.forEach(category => {
          initialFilters[category.Id] = 'all';
        });
        setSelectedFilters(initialFilters);

      } catch (error) {
        console.error("无法获取分类数据:", error);
      }
    };

    fetchData();
  }, []);

  // 选中变更后，统一在提交阶段通过 effect 回传
  useEffect(() => {
    if (Object.keys(selectedFilters).length === 0) return;
    
    const ids = Object.values(selectedFilters)
      .filter((id): id is number => typeof id === 'number') // 只保留数字ID
      .join(',');
      
    onChangeRef.current?.(ids);
  }, [selectedFilters]);

  const handleFilterClick = (parentId: number, sonId: number | 'all') => {
    setSelectedFilters(prev => ({
      ...prev,
      [parentId]: sonId,
    }));
  };

  const getFilterClasses = (isActive: boolean) => 
    `cursor-pointer transition-colors whitespace-nowrap ${
      isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
    }`;

  return (
    <div className="p-4 sm:p-6 bg-black text-white font-sans space-y-5">
      <div className="space-y-5">
        {categories.map(category => (
          // 【修改点 1】: 这是每一行的外层容器。
          // 移除了 flex-wrap，确保“一级目录标题”和“二级目录列表”总是在同一行开始。
          <div key={category.Id} className="flex items-baseline gap-x-4 sm:gap-x-6">
            
            {/* 【修改点 2】: 一级目录标题。 */}
            {/* 添加了 flex-shrink-0，防止标题在空间不足时被挤压变形。 */}
            <div className="bg-[#1f2937] text-white px-4 py-1.5 rounded-md whitespace-nowrap text-sm sm:text-base flex-shrink-0">
              {category.Name}
            </div>

            {/* 【修改点 3】: 这是二级目录的容器。 */}
            {/* 它自己是 flex 和 flex-wrap，所以它内部的按钮会在需要时换行。 */}
            {/* 换行后会自动从这个容器的左侧开始，从而实现了“缩进”效果。 */}
            <div className="flex flex-wrap items-baseline gap-x-4 sm:gap-x-6 gap-y-3">
              <button
                onClick={() => handleFilterClick(category.Id, 'all')}
                className={getFilterClasses(selectedFilters[category.Id] === 'all')}
              >
                全部
              </button>

              {category.SonCategory?.map(son => (
                <button
                  key={son.Id}
                  onClick={() => handleFilterClick(category.Id, son.Id)}
                  className={getFilterClasses(selectedFilters[category.Id] === son.Id)}
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