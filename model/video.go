package model

import (
	"time"
	"video/core"

	"gorm.io/gorm"
)

type Video struct {
	gorm.Model
	Id           int64           `gorm:"column:primaryKey;id" json:"Id"`            //type:int64        comment:              version:2025-00-22 15:16
	CreatedAt    *time.Time      `gorm:"column:created_at" json:"CreatedAt"`        //type:*time.Time   comment:创建时间      version:2025-00-22 15:16
	UpdatedAt    *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"`        //type:*time.Time   comment:更新时间      version:2025-00-22 15:16
	DeletedAt    *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"`        //type:*time.Time   comment:删除时间      version:2025-00-22 15:16
	Title        string          `gorm:"column:title" json:"Title"`                 //type:string       comment:标题          version:2025-00-22 15:16
	Connection   *int            `gorm:"column:connection" json:"Connection"`       //type:*int         comment:连接方式      version:2025-00-22 15:16
	Url          string          `gorm:"column:url" json:"Url"`                     //type:string       comment:连接地址      version:2025-00-22 15:16
	Cover        string          `gorm:"column:cover" json:"Cover"`                 //type:string       comment:封面          version:2025-00-22 15:16
	VideoGroupId int64           `gorm:"column:video_group_id" json:"VideoGroupId"` //type:int64        comment:视频分组id    version:2025-00-22 15:16
}

// TableName 表名:video，。
func (*Video) TableName() string {
	return "video"
}

func (that *Video) Create() (err error) {
	err = core.New().DB.Create(that).Error
	return
}

func (that *Video) List(page int, pageSize int, id int64) (data []Video, total int64, err error) {
	core.New().DB.Model(&Video{}).Count(&total)
	err = core.New().DB.Where("id > ?", id).Offset((page - 1) * pageSize).Limit(pageSize).Find(&data).Error
	return
}

func (that *Video) Get(id int64) (data Video, err error) {
	err = core.New().DB.Where("id = ?", id).First(&data).Error
	return
}

func (that *Video) Del(id int64) (err error) {
	err = core.New().DB.Where("id = ?", id).Delete(&Video{}).Error
	return
}
