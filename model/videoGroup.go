package model

import (
	"time"
	"video/core"

	"gorm.io/gorm"
)

// VideoGroup  视频分组。
type VideoGroup struct {
	Id        int64           `gorm:"column:id;primaryKey" json:"Id"`     //type:int64             comment:            version:2025-05-22 09:55
	CreatedAt *time.Time      `gorm:"column:created_at" json:"CreatedAt"` //type:*time.Time        comment:创建时间    version:2025-05-22 09:55
	UpdatedAt *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"` //type:*time.Time        comment:更新时间    version:2025-05-22 09:55
	DeletedAt *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"` //type:*gorm.DeletedAt   comment:删除时间    version:2025-05-22 09:55
	Title     string          `gorm:"column:title" json:"Title"`          //type:string            comment:标题        version:2025-05-22 09:55
	IsHide    int             `gorm:"column:is_hide" json:"IsHide"`       //type:*int              comment:是否隐藏    version:2025-05-22 09:55
}

// TableName 表名:video_group，视频分组。
func (*VideoGroup) TableName() string {
	return "video_group"
}

func (that *VideoGroup) Edit() {
	var videoGroupData VideoGroup
	core.New().DB.Model(that).Where("title = ?", that.Title).First(&videoGroupData)

	if videoGroupData.Id > 0 {
		that.Id = videoGroupData.Id
	} else {
		if that.IsHide <= 0 {
			that.IsHide = 2
		}
		core.New().DB.Model(that).Create(&that)
	}
}
