'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// 类型定义...
interface Category {
  Id: number;
  Name: string;
  SonCategory: Category[] | null;
}
interface ApiResponse {
  Data: Category[];
}
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// 向父组件回传选中二级分类ID（逗号分隔）的回调
type CategoryMenuProps = {
  onChange?: (ids: string) => void;
};

const CategoryMenu = ({ onChange }: CategoryMenuProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSelections, setActiveSelections] = useState<Record<number, number | null>>({});
  
  const scrollableRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const onChangeRef = useRef<CategoryMenuProps["onChange"] | null>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 为指定的元素应用拖动/触摸滑动功能
  const applyDragToScroll = useCallback((slider: HTMLDivElement | null) => {
    if (!slider) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      slider.style.cursor = 'grabbing';
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      isDown = true;
      startX = e.touches[0].pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const handleMouseLeaveOrUp = () => {
      isDown = false;
      slider.style.cursor = 'pointer';
    };
    
    const handleTouchEnd = () => {
      isDown = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    };

    const handleTouchMove = (e: TouchEvent) => {
        if(!isDown) return;
        const x = e.touches[0].pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5;
        slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mouseleave', handleMouseLeaveOrUp);
    slider.addEventListener('mouseup', handleMouseLeaveOrUp);
    slider.addEventListener('mousemove', handleMouseMove);
    slider.addEventListener('touchstart', handleTouchStart, { passive: true });
    slider.addEventListener('touchend', handleTouchEnd);
    slider.addEventListener('touchmove', handleTouchMove);

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('mouseleave', handleMouseLeaveOrUp);
      slider.removeEventListener('mouseup', handleMouseLeaveOrUp);
      slider.removeEventListener('mousemove', handleMouseMove);
      slider.removeEventListener('touchstart', handleTouchStart);
      slider.removeEventListener('touchend', handleTouchEnd);
      slider.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  useEffect(() => {
    const cleanupFunctions = Array.from(scrollableRefs.current.values()).map(slider => applyDragToScroll(slider)).filter(Boolean);
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup!());
    };
  }, [categories, applyDragToScroll]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/category/list`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result: ApiResponse = await response.json();
        setCategories(result.Data);
        if (result.Data) {
          const initialSelections: Record<number, number | null> = {};
          result.Data.forEach(category => {
            initialSelections[category.Id] = 0; 
          });
          setActiveSelections(initialSelections);
        }
      } catch (error) {
        console.error('获取分类数据失败: ', error);
      }
    };
    fetchData();
  }, []);

  const handleSecondaryClick = (primaryId: number, secondaryId: number) => {
    // 仅更新本地选中态，通知父组件放到 effect 中，避免在渲染阶段触发父组件 setState
    const updated = { ...activeSelections, [primaryId]: secondaryId };
    setActiveSelections(updated);
  };

  // 选中变更后，统一在提交阶段通过 effect 回传，避免 render 阶段副作用
  useEffect(() => {
    if (!onChangeRef.current) return;
    const ids = Object.values(activeSelections)
      .filter((id): id is number => typeof id === 'number' && id !== 0)
      .join(',');
    onChangeRef.current?.(ids);
  }, [activeSelections]);

  return (
    <div className="p-4 bg-gray-900 text-white space-y-3 overflow-x-hidden">
      {/* ----- 核心改动：修改了 .map 的参数和 key 的值 ----- */}
      {categories.map((category, index) => (
        <div key={`${category.Id}-${index}`} className="grid grid-cols-[auto,1fr] items-center gap-x-4">
          
          <div className="flex-shrink-0">
            <div className="p-2 px-5 rounded-lg bg-blue-600 text-white font-semibold">
              {category.Name}
            </div>
          </div>
          
          <div
            ref={el => {
                // 使用组合键来确保 ref 的 key 也是唯一的
                const uniqueKey = `${category.Id}-${index}`;
                if (el) scrollableRefs.current.set(uniqueKey, el);
                else scrollableRefs.current.delete(uniqueKey);
            }}
            className="overflow-x-auto select-none"
            style={{ 
              cursor: 'pointer',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <ul className="flex items-center space-x-4 whitespace-nowrap">
              <li className="flex-shrink-0">
                <button
                  onClick={() => handleSecondaryClick(category.Id, 0)}
                  className={`p-2 px-4 rounded-lg transition-colors duration-200 ${activeSelections[category.Id] === 0 || !activeSelections[category.Id] ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  全部
                </button>
              </li>
              {/* 注意：如果 SonCategory 内部也可能存在重复ID，也需要用同样的方法修复 */}
              {category.SonCategory?.map((subCategory) => (
                <li key={subCategory.Id} className="flex-shrink-0">
                  <button
                    onClick={() => handleSecondaryClick(category.Id, subCategory.Id)}
                    className={`p-2 px-4 rounded-lg transition-colors duration-200 ${activeSelections[category.Id] === subCategory.Id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                  >
                    {subCategory.Name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryMenu;