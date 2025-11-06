package model

import (
	"time"
	"video/core"

	"gorm.io/gorm"
)

// VideoCategory  。
type VideoCategory struct {
	Id         int64           `gorm:"column:id;primaryKey" json:"Id"`                                               //type:int64        comment:            version:2025-01-09 22:35
	CreatedAt  *time.Time      `gorm:"column:created_at" json:"CreatedAt"`                                           //type:*time.Time   comment:创建时间    version:2025-01-09 22:35
	UpdatedAt  *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"`                                           //type:*time.Time   comment:更新时间    version:2025-01-09 22:35
	DeletedAt  *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"`                                           //   删除时间，使用 gorm.DeletedAt 以启用软删除
	VideoId    int64           `gorm:"column:video_id;index:idx_video_id;uniqueIndex:uk_vc" json:"VideoId"`          //type:int64        comment:
	CategoryId int64           `gorm:"column:category_id;index:idx_category_id;uniqueIndex:uk_vc" json:"CategoryId"` //type:int64        comment:
}

// TableName 表名:video_category，。
func (*VideoCategory) TableName() string {
	return "video_category"
}

// ListByVideoId 根据视频 ID 返回其所属的父级分类列表，并将子分类填充到每个父级的 SonCategory 中
// 契约：
// - 输入：videoId（必填）
// - 输出：按父分类分组的列表（[]Category），每个 Category 的 SonCategory 只包含与该视频相关的子类
// - 错误：数据库查询失败时返回 error
func ListByVideoId(videoId int64) (parentCategory []Category, err error) {
	if videoId <= 0 {
		return
	}

	db := core.New().DB

	// 1) 查询该视频直接绑定的分类（通常为子分类）
	var categories []Category
	if err = db.Select("category.*").
		Joins("INNER JOIN video_category ON category.id = video_category.category_id").
		Where("video_category.video_id = ?", videoId).
		Find(&categories).Error; err != nil {
		return
	}
	if len(categories) == 0 {
		return
	}

	// 2) 汇总并去重父级 ID
	parentIds := make([]int64, 0, len(categories))
	seen := make(map[int64]struct{}, len(categories))
	for i := range categories {
		pid := categories[i].ParentId
		if pid == 0 { // 无父级，跳过父类查询（通常认为这类本身是顶级类）
			continue
		}
		if _, ok := seen[pid]; ok {
			continue
		}
		seen[pid] = struct{}{}
		parentIds = append(parentIds, pid)
	}

	if len(parentIds) == 0 {
		// 所有关联分类均为顶级类，直接返回空父类列表（或者按需返回这些顶级类）
		return
	}

	// 3) 查询父级分类
	if err = db.Select("category.*").
		Where("id IN (?)", parentIds).
		Find(&parentCategory).Error; err != nil {
		return
	}

	if len(parentCategory) == 0 {
		return
	}

	// 4) 将子分类挂载到对应父分类的 SonCategory
	// 构建按 parentId 分组的映射，减少嵌套循环的复杂度
	childrenByParent := make(map[int64][]Category, len(parentIds))
	for i := range categories {
		pid := categories[i].ParentId
		if pid == 0 {
			continue
		}
		childrenByParent[pid] = append(childrenByParent[pid], categories[i])
	}

	for i := range parentCategory {
		parent := &parentCategory[i]
		if kids, ok := childrenByParent[parent.Id]; ok {
			parent.SonCategory = append(parent.SonCategory, kids...)
		}
	}
	return
}
