package model

import "time"

// VideoCategory  。
type VideoCategory struct {
	Id         int64      `gorm:"column:id;primaryKey" json:"Id"`       //type:int64        comment:            version:2025-01-09 22:35
	CreatedAt  *time.Time `gorm:"column:created_at" json:"CreatedAt"`   //type:*time.Time   comment:创建时间    version:2025-01-09 22:35
	UpdatedAt  *time.Time `gorm:"column:updated_at" json:"UpdatedAt"`   //type:*time.Time   comment:更新时间    version:2025-01-09 22:35
	DeletedAt  *time.Time `gorm:"column:deleted_at" json:"DeletedAt"`   //type:*time.Time   comment:删除时间    version:2025-01-09 22:35
	VideoId    int64      `gorm:"column:video_id" json:"VideoId"`       //type:int64        comment:            version:2025-01-09 22:35
	CategoryId int64      `gorm:"column:category_id" json:"CategoryId"` //type:int64        comment:            version:2025-01-09 22:35
}

// TableName 表名:video_category，。
func (*VideoCategory) TableName() string {
	return "video_category"
}
