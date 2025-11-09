package model

import (
	"time"
	"video/core"

	"gorm.io/gorm"
)

// VideoClass  。
type VideoClass struct {
	Id            int64           `gorm:"column:id;primaryKey" json:"Id"`     //
	CreatedAt     *time.Time      `gorm:"column:created_at" json:"CreatedAt"` // 创建时间
	UpdatedAt     *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"` // 更新时间
	DeletedAt     *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"` // 删除时间
	TypeId        int64           `gorm:"column:type_id" json:"TypeId"`       //
	TypeName      string          `gorm:"column:type_name" json:"TypeName"`   //
	TypePid       int64           `gorm:"column:type_pid" json:"TypePid"`     //
	VideoClassSon []VideoClass    `gorm:"foreignKey:TypePid;references:Id" json:"VideoClassSon,omitempty"`
}

// TableName 表名:video_class，。
func (*VideoClass) TableName() string {
	return "video_class"
}

func (that *VideoClass) Create() (err error) {
	if that.TypeId == 0 {
		return
	}
	var oldVideoClass VideoClass
	core.New().DB.
		Where("type_id = ?", that.TypeId).
		First(&oldVideoClass)

	if oldVideoClass.Id > 0 {
		core.New().DB.Where("id = ?", oldVideoClass.Id).Updates(that)
	} else {
		err = core.New().DB.Create(that).Error
	}
	return
}
func (that *VideoClass) List() (categorySonArr []VideoClass) {
	var categoryData Category
	core.New().DB.Model(that).
		Preload("VideoClassSon").
		Find(&categoryData)
	return

}
