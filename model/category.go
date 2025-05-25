package model

import (
	"time"
	"video/core"

	"gorm.io/gorm"
)

// Category  分类表。
type Category struct {
	Id        int64           `gorm:"column:id;primaryKey" json:"Id"`     //
	CreatedAt *time.Time      `gorm:"column:created_at" json:"CreatedAt"` //        创建时间
	UpdatedAt *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"` //        更新时间
	DeletedAt *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"` //   删除时间
	Name      string          `gorm:"column:name" json:"Name"`            //
	ParentId  int64           `gorm:"column:parent_id" json:"ParentId"`   //
	Type      *int            `gorm:"column:type" json:"Type"`            //
	Category  []Category      `gorm:"foreignKey:ParentId;references:Id" json:"Category"`
}

// TableName 表名:category，分类表。
func (*Category) TableName() string {
	return "category"
}

const (
	CategoryTypeMovie    = 1
	CategoryTypeTVSeries = 2
)

func (that *Category) Create(cType int, categoryArr []*Category) (categoryIds []int64) {
	for index := range categoryArr {
		category := categoryArr[index]
		var parentCategory Category
		core.New().DB.Where("name = ?", category.Name).Where("type = ?", cType).First(&parentCategory)
		if parentCategory.Id <= 0 {
			parentCategory.Name = category.Name
			parentCategory.Type = &cType
			core.New().DB.Create(&parentCategory)
		}

		if len(category.Category) > 0 {
			for index := range category.Category {
				var sonCategory Category
				core.New().DB.Where("name = ?", category.Category[index].Name).
					Where("type = ?", cType).First(&sonCategory)

				if sonCategory.Id <= 0 {
					sonCategory.ParentId = parentCategory.Id
					sonCategory.Name = category.Category[index].Name
					sonCategory.Type = &cType
					core.New().DB.Create(&sonCategory)
				}

				categoryIds = append(categoryIds, sonCategory.Id)
			}
		} else {
			categoryIds = append(categoryIds, parentCategory.Id)
		}
	}
	return
}
