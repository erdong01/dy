package model

import (
	"time"
	"video/core"

	"gorm.io/gorm"
)

type Video struct {
	Id           int64           `gorm:"column:id;primaryKey" json:"Id"`            //type:int64        comment:              version:2025-00-22 15:16
	CreatedAt    *time.Time      `gorm:"column:created_at" json:"CreatedAt"`        //type:*time.Time   comment:创建时间      version:2025-00-22 15:16
	UpdatedAt    *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"`        //type:*time.Time   comment:更新时间      version:2025-00-22 15:16
	DeletedAt    *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"`        //type:*time.Time   comment:删除时间      version:2025-00-22 15:16
	Title        string          `gorm:"column:title" json:"Title"`                 //type:string       comment:标题          version:2025-00-22 15:16
	Alias        string          `gorm:"column:alias" json:"Alias"`                 //type:string            comment:别名                    version:2025-05-06 07:26
	Describe     string          `gorm:"column:describe" json:"Describe"`           //type:string            comment:描述          version:2025-01-18 22:36
	Connection   *int            `gorm:"column:connection" json:"Connection"`       //type:*int         comment:连接方式      version:2025-00-22 15:16
	Url          string          `gorm:"column:url" json:"Url"`                     //type:string       comment:连接地址      version:2025-00-22 15:16
	Cover        string          `gorm:"column:cover" json:"Cover"`                 //type:string       comment:封面          version:2025-00-22 15:16
	VideoGroupId int64           `gorm:"column:video_group_id" json:"VideoGroupId"` //type:int64        comment:视频分组id    version:2025-00-22 15:16
	Category     []*Category     `gorm:"-" json:"Category"`
	VideoGroup   VideoGroup      `gorm:"-" json:"VideoGroup"`
	VideoList    []Video         `gorm:"-" json:"VideoList"`
	Type         *int            `gorm:"column:type" json:"Type"` //type:*int              comment:类型 1 电影 2 电视剧    version:2025-05-06 06:51

}

// TableName 表名:video，。
func (*Video) TableName() string {
	return "video"
}

func (that *Video) Create() (err error) {
	err = core.New().DB.Create(that).Error
	return
}

func (that *Video) List(page int, pageSize int, id int64, keyWord string) (data []Video, total int64, err error) {
	core.New().DB.Model(&Video{}).Count(&total)
	db := core.New().DB.Model(&Video{})
	if keyWord != "" {
		db.Where("MATCH(title) AGAINST(?)", keyWord)
	}
	err = db.Where("id > ?", id).Offset((page - 1) * pageSize).Order("id DESC").Limit(pageSize).Find(&data).Error
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

func (that *Video) ListByVideoGroupId(videoGroupId int64) (data []Video) {

	core.New().DB.Model(that).Where("video_group_id = ?", &videoGroupId).Find(&data)

	return
}
