package model

import (
	"fmt"
	"time"
	"video/core"

	"gorm.io/gorm"
)

// VideoUrl  视频地址。
type VideoUrl struct {
	Id        int64           `gorm:"column:id;primaryKey" json:"Id"`     //type:int64             comment:            version:2025-9-29 09:01
	CreatedAt *time.Time      `gorm:"column:created_at" json:"CreatedAt"` //type:*time.Time        comment:创建时间    version:2025-9-29 09:01
	UpdatedAt *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"` //type:*time.Time        comment:更新时间    version:2025-9-29 09:01
	DeletedAt *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"` //type:*gorm.DeletedAt   comment:删除时间    version:2025-9-29 09:01
	VideoId   int64           `gorm:"column:video_id" json:"VideoId"`     //type:int64             comment:视频id      version:2025-9-29 09:01
	Url       string          `gorm:"column:url" json:"Url"`              //type:string            comment:地址        version:2025-9-29 09:01
	Proxy     string          `gorm:"column:proxy" json:"Proxy"`          //type:string            comment:代理地址    version:2025-9-29 09:01
	ProxyName string          `gorm:"column:proxy_name" json:"ProxyName"` //type:string            comment:代理名称    version:2025-9-29 09:56
}

// TableName 表名:video_url，视频地址。
func (that *VideoUrl) TableName() string {
	return "video_url"
}

// TableName 表名:video_url，视频地址。
func (that *VideoUrl) Create(tx *gorm.DB) (err error) {
	if tx == nil {
		tx = core.New().DB.DB.DB
	}
	if that.Proxy == "" || that.Url == "" {
		fmt.Println("12312313123")
		return
	}
	var videoUrl VideoUrl
	tx.Where("video_id = ?", that.VideoId).
		Where("proxy_name = ?", that.ProxyName).
		First(&videoUrl)

	if videoUrl.Id > 0 {
		tx.Where("id = ?", videoUrl.Id).Updates(that)
	} else {
		err = tx.Create(that).Error
	}

	return
}
