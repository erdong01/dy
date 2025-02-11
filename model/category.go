package model

import (
	"time"

	"gorm.io/gorm"
)

// Category  分类表。
type Category struct {
	Id        int64           `gorm:"column:primaryKey;id" json:"Id"`     //type:int64             comment:            version:2025-01-09 22:35
	CreatedAt *time.Time      `gorm:"column:created_at" json:"CreatedAt"` //type:*time.Time        comment:创建时间    version:2025-01-09 22:35
	UpdatedAt *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"` //type:*time.Time        comment:更新时间    version:2025-01-09 22:35
	DeletedAt *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"` //type:*gorm.DeletedAt   comment:删除时间    version:2025-01-09 22:35
	Name      string          `gorm:"column:name" json:"Name"`            //type:string            comment:            version:2025-01-09 22:35
	ParentId  int64           `gorm:"column:parent_id" json:"ParentId"`   //type:int64             comment:            version:2025-01-09 22:35
	Type      *int            `gorm:"column:type" json:"Type"`            //type:*int              comment:            version:2025-01-09 22:35
}

// TableName 表名:category，分类表。
func (*Category) TableName() string {
	return "category"
}
