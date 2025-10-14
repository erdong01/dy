// lib/pagination.ts

export const DOTS = '...';

/**
 * 创建一个从 start 到 end 的数字范围数组
 * @param {number} start - 范围的起始数字
 * @param {number} end - 范围的结束数字
 * @returns {number[]} - 数字数组
 */
const range = (start: number, end: number): number[] => {
    const length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
};

interface UsePaginationProps {
    total: number;       // 数据总数
    pageSize: number;    // 每页大小
    siblingCount?: number; // 当前页码两侧应该显示的页码数量
    currentPage: number; // 当前页码
}

/**
 * 自定义 Hook，用于生成适应性分页的页码范围
 */
export const usePagination = ({
    total,
    pageSize,
    siblingCount = 1,
    currentPage
}: UsePaginationProps): (string | number)[] => {
    const totalPageCount = Math.ceil(total / pageSize);

    // 总共要显示的页码块数量 = siblingCount + 首尾页 + 当前页 + 2个省略号
    const totalPageNumbers = siblingCount + 5;

    /*
      情况 1: 如果总页数小于我们想要显示的数量，
      就不需要任何省略逻辑，直接返回所有页码。
    */
    if (totalPageNumbers >= totalPageCount) {
        return range(1, totalPageCount);
    }

    /*
      计算当前页码左右两侧的兄弟页码的索引。
      确保它们不会越界（即小于1或大于总页数）。
    */
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPageCount);

    /*
      判断是否需要显示左侧或右侧的省略号。
      只有当左侧兄弟页码与第一页之间至少有一个页码的差距时，才显示左侧省略号。
      右侧同理。
    */
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;

    /*
      情况 2: 不需要显示左侧省略号，但需要显示右侧省略号。
      [1, 2, 3, 4, 5, ..., 50]
    */
    if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + 2 * siblingCount;
        const leftRange = range(1, leftItemCount);

        return [...leftRange, DOTS, totalPageCount];
    }

    /*
      情况 3: 需要显示左侧省略号，但不需要显示右侧省略号。
      [1, ..., 46, 47, 48, 49, 50]
    */
    if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + 2 * siblingCount;
        const rightRange = range(totalPageCount - rightItemCount + 1, totalPageCount);
        return [firstPageIndex, DOTS, ...rightRange];
    }

    /*
      情况 4: 左右两侧都需要显示省略号。
      [1, ..., 24, 25, 26, ..., 50]
    */
    if (shouldShowLeftDots && shouldShowRightDots) {
        const middleRange = range(leftSiblingIndex, rightSiblingIndex);
        return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }

    // 默认返回空数组，理论上不会执行到这里
    return [];
};