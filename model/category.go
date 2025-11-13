package model

import (
	"fmt"
	"strings"
	"time"

	"video/core"

	"gorm.io/gorm"
)

const (
	CategoryTypeMovie    = 1 // 电影
	CategoryTypeTVSeries = 2 // 电视剧
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
	IsHide    *int            `gorm:"column:is_hide" json:"IsHide"`       // type:*int              comment:            version:2025-05-06 06:48
	TypeId    int64           `gorm:"column:type_id" json:"TypeId"`       //type:int64             comment:            version:2025-9-28 17:18
	TypePid   int64           `gorm:"column:type_pid" json:"TypePid"`     //type:int64             comment:            version:2025-9-28 17:18

	SonCategory []Category `gorm:"foreignKey:ParentId;references:Id" json:"SonCategory"`
	Category    []Category `gorm:"foreignKey:ParentId;references:Id" json:"Category,omitempty"`
}

// TableName 表名:category，分类表。
func (*Category) TableName() string {
	return "category"
}

func (that *Category) HomeList() (categorySonArr []Category) {
	var categoryData Category
	err := core.New().DB.Model(that.Category).
		Preload("SonCategory").
		Where("parent_id = 0 AND type = 1 AND name = ?", "类型").Find(&categoryData).Error
	if err != nil {
		fmt.Println("err:", err)
	}

	var categoryData2 Category
	err = core.New().DB.Model(that.Category).
		Preload("SonCategory", func(db *gorm.DB) *gorm.DB {

			return db.Order("name desc")
		}).
		Where("parent_id = 0 AND type = 1 AND name = ?", "年代").Find(&categoryData2).Error
	if err != nil {
		fmt.Println("err:", err)
	}
	var categoryData3 Category
	err = core.New().DB.Model(that.Category).
		Preload("SonCategory").
		Where("parent_id = 0 AND type = 1 AND name = ?", "地区").Find(&categoryData3).Error
	if err != nil {
		fmt.Println("err:", err)
	}

	categoryData.Name = "类型"
	categorySonArr = append(categorySonArr, categoryData)

	categoryData.Name = "年代"
	categorySonArr = append(categorySonArr, categoryData2)

	categoryData.Name = "地区"
	categorySonArr = append(categorySonArr, categoryData3)
	return
}

func (that *Category) Create(cType int, categoryArr []*Category, videoClass VideoClass) (categoryIds []int64) {
	for index := range categoryArr {
		category := categoryArr[index]
		var parentCategory Category
		core.New().DB.Unscoped().Where("name = ?", category.Name).First(&parentCategory)
		if parentCategory.Id <= 0 {
			parentCategory.Name = category.Name
			parentCategory.Type = &cType
			core.New().DB.Create(&parentCategory)
		}
		if len(category.Category) > 0 {
			for index := range category.Category {
				names := strings.Split(category.Category[index].Name, ",")
				if len(names) == 1 {
					names = strings.Split(category.Category[index].Name, "/")
				}
				if len(names) == 1 {
					names = strings.Split(category.Category[index].Name, ".")
				}
				if len(names) == 1 {
					names = strings.Split(category.Category[index].Name, "、")
				}
				if len(names) == 1 {
					names = strings.Split(category.Category[index].Name, "，")
				}
				if category.Name == "地区" {
					if len(names) == 1 {
						names = strings.Split(category.Category[index].Name, " ")
					}
				}
				for i := range names {
					name := strings.TrimSpace(names[i])
					if name == "" {
						continue
					}
					var sonCategory Category
					core.New().DB.Unscoped().Where("name = ?", name).
						Where("type = ?", cType).First(&sonCategory)

					if sonCategory.Id <= 0 {
						sonCategory.ParentId = parentCategory.Id
						sonCategory.Name = name
						sonCategory.Type = &cType
						core.New().DB.Create(&sonCategory)
					}
					categoryIds = append(categoryIds, sonCategory.Id)
				}
			}
		} else {
			categoryIds = append(categoryIds, parentCategory.Id)
		}
	}
	return
}
