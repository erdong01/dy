package model

import (
	"time"
	"video/core"

	"gorm.io/gorm"
)

// VideoClass  。
type VideoClass struct {
	Id        int64           `gorm:"column:id;primaryKey" json:"Id"`     //type:int64             comment:            version:2025-9-27 19:12
	CreatedAt *time.Time      `gorm:"column:created_at" json:"CreatedAt"` //type:*time.Time        comment:创建时间    version:2025-9-27 19:12
	UpdatedAt *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"` //type:*time.Time        comment:更新时间    version:2025-9-27 19:12
	DeletedAt *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"` //type:*gorm.DeletedAt   comment:删除时间    version:2025-9-27 19:12
	TypeId    int64           `gorm:"column:type_id" json:"TypeId"`       //type:int64             comment:            version:2025-9-27 19:12
	TypeName  string          `gorm:"column:type_name" json:"TypeName"`   //type:string            comment:            version:2025-9-27 19:12
	TypePid   int64           `gorm:"column:type_pid" json:"TypePid"`     //type:int64             comment:            version:2025-9-27 19:12
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
