package model

import (
	"strings"
	"time"

	"video/core"

	"gorm.io/gorm"
)

type Video struct {
	Id           int64           `gorm:"column:id;primaryKey" json:"Id"`            //type:int64        comment:              version:2025-00-22 15:16
	CreatedAt    *time.Time      `gorm:"column:created_at" json:"CreatedAt"`        // type:*time.Time   comment:创建时间      version:2025-00-22 15:16
	UpdatedAt    *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"`        // type:*time.Time   comment:更新时间      version:2025-00-22 15:16
	DeletedAt    *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"`        // type:*time.Time   comment:删除时间      version:2025-00-22 15:16
	Title        string          `gorm:"column:title" json:"Title"`                 //type:string       comment:标题          version:2025-00-22 15:16
	Alias        string          `gorm:"column:alias" json:"Alias"`                 //type:string            comment:别名                    version:2025-05-06 07:26
	Describe     string          `gorm:"column:describe" json:"Describe"`           //type:string            comment:描述          version:2025-01-18 22:36
	Connection   *int            `gorm:"column:connection" json:"Connection"`       // type:*int         comment:连接方式      version:2025-00-22 15:16
	Url          string          `gorm:"column:url" json:"Url"`                     //type:string       comment:连接地址      version:2025-00-22 15:16
	Cover        string          `gorm:"column:cover" json:"Cover"`                 //type:string       comment:封面          version:2025-00-22 15:16
	VideoGroupId int64           `gorm:"column:video_group_id" json:"VideoGroupId"` //type:int64        comment:视频分组id    version:2025-00-22 15:16
	Category     []*Category     `gorm:"-" json:"Category"`
	VideoGroup   VideoGroup      `gorm:"-" json:"VideoGroup"`
	VideoClass   VideoClass      `gorm:"-" json:"VideoClass"`
	VideoList    []Video         `gorm:"-" json:"VideoList"`
	Type         *int            `gorm:"column:type" json:"Type"`         // type:*int              comment:类型 1 电影 2 电视剧    version:2025-05-06 06:51
	Keywords     string          `gorm:"column:keywords" json:"Keywords"` //type:string            comment:关键词 ,逗号隔开        version:2025-9-28 17:40
	TypePid      int64           `gorm:"column:type_pid" json:"TypePid"`  //type:int64             comment:                        version:2025-9-28 17:45
	TypeId       int64           `gorm:"column:type_id" json:"TypeId"`    //type:int64             comment:                        version:2025-9-28 17:45
}

// TableName 表名:video，。
func (*Video) TableName() string {
	return "video"
}

func (that *Video) Create() (err error) {
	var oldVideo Video
	core.New().DB.
		Where("MATCH(title) AGAINST(CONCAT('\"', ?, '\"') IN BOOLEAN MODE)", that.Title).
		Where("title = ?", that.Title).
		First(&oldVideo)
	if oldVideo.Id > 0 {
		core.New().DB.Where("id = ?", oldVideo.Id).Updates(that)
		that.Id = oldVideo.Id
	} else {
		err = core.New().DB.Create(that).Error
	}

	return
}

func (that *Video) List(page int, pageSize int, id int64, keyWord string, categoryId string) (data []Video, total int64, err error) {
	buildFilteredQuery := func() *gorm.DB {
		filtered := core.New().DB.Model(&Video{})

		if keyWord != "" {
			filtered = filtered.Where("MATCH(title) AGAINST(?)", keyWord)
		}

		if categoryId != "" {
			clean := strings.Trim(strings.TrimSpace(categoryId), "\"'")
			var ids []string
			if strings.Contains(clean, ",") {
				parts := strings.Split(clean, ",")
				for _, p := range parts {
					p = strings.Trim(strings.TrimSpace(p), "\"'")
					if p != "" {
						ids = append(ids, p)
					}
				}
			} else if clean != "" {
				ids = append(ids, clean)
			}

			if len(ids) > 0 {
				subQuery := core.New().DB.Model(&VideoCategory{}).
					Select("video_id").
					Where("category_id IN ?", ids).
					Group("video_id").
					Having("COUNT(DISTINCT category_id) = ?", len(ids))

				filtered = filtered.Where("id IN (?)", subQuery)
			}
		}

		return filtered
	}

	// 1. 计算总量，统计分组后的数量
	err = buildFilteredQuery().Distinct("video_group_id").Count(&total).Error
	if err != nil {
		return
	}
	if total == 0 {
		return // 如果总数为0，没必要执行后续的Find查询
	}

	// 2. 构建每个分组最新的视频 ID，避免 GROUP BY 与 ONLY_FULL_GROUP_BY 冲突
	latestIDs := buildFilteredQuery()
	if id > 0 {
		latestIDs = latestIDs.Where("id > ?", id)
	}
	latestIDs = latestIDs.Select("MAX(id)").Group("video_group_id")

	// 3. 根据最新 ID 查询视频详情并分页
	query := core.New().DB.Model(&Video{}).
		Where("id IN (?)", latestIDs).
		Order("id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize)

	if id > 0 {
		query = query.Where("id > ?", id)
	}

	err = query.Find(&data).Error

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
