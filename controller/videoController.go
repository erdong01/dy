package controller

import (
	"fmt"
	"net/http"
	"strconv"

	"video/core"
	"video/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func List(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println(r)
			c.JSON(http.StatusOK, gin.H{
				"Data":   []model.Video{},
				"LastId": 0,
				"Total":  0,
			})
		}
	}()

	// 解析查询参数，失败时使用默认值，避免直接 return 导致空响应
	var (
		err      error
		page     int
		pageSize int
		id       int64
	)
	if p := c.Query("Page"); p != "" {
		if page, err = strconv.Atoi(p); err != nil {
			page = 1
		}
	} else {
		page = 1
	}
	if ps := c.Query("PageSize"); ps != "" {
		if pageSize, err = strconv.Atoi(ps); err != nil {
			pageSize = 30
		}
	} else {
		pageSize = 30
	}
	if idStr := c.Query("Id"); idStr != "" {
		if id, err = strconv.ParseInt(idStr, 10, 64); err != nil {
			id = 0
		}
	} else {
		id = 0
	}
	var categoryId string
	if categoryIdStr := c.Query("CategoryId"); categoryIdStr != "" {
		categoryId = categoryIdStr
	}

	keyWord := c.Query("KeyWord")

	var video model.Video
	data, total, err := video.List(page, pageSize, id, keyWord, categoryId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"Data":   []model.Video{},
			"LastId": 0,
			"Total":  0,
		})
		return
	}
	var lastId int64
	if len(data) > 0 {
		lastId = data[len(data)-1].Id
	}
	c.JSON(http.StatusOK, gin.H{
		"Data":   data,
		"LastId": lastId,
		"Total":  total,
	})
}

func Get(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println(r)
		}
	}()
	id, err := strconv.ParseInt(c.Query("Id"), 10, 64)
	if err != nil {
		return
	}
	var video model.Video
	data, err := video.Get(id)
	if err != nil {
		return
	}
	go func(id int64) {
		core.New().DB.Model(&model.Video{}).Where("id = ?", id).
			UpdateColumn("browse", gorm.Expr("browse + 1"))
	}(id)
	category, _ := model.ListByVideoId(id)
	c.JSON(http.StatusOK, gin.H{
		"Data":     data,
		"Category": category,
	})
}

// 创建
func Create(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println(r)
		}
	}()
	var video model.Video
	err := c.BindJSON(&video)
	if err != nil {
		return
	}
	video.VideoClass.Create()

	video.TypeId = video.VideoClass.TypeId
	video.TypePid = video.VideoClass.TypePid
	cc := model.Category{}
	categoryIds := cc.Create(*video.Category[0].Type, video.Category, video.VideoClass)
	video.VideoGroup.Edit()
	if video.VideoGroup.Id > 0 {
		video.VideoGroupId = video.VideoGroup.Id
	}
	err = video.Create()
	if err != nil {
		return
	}
	video.VideoUrl.VideoId = video.Id
	video.VideoUrl.Create()
	// 同步 Video-Category 关联：已存在不创建、缺失则新增、多余则删除
	db := core.New().DB
	tx := db.Begin()
	if tx.Error != nil {
		return
	}
	// 查询当前已存在的关联
	var existing []model.VideoCategory
	if err := tx.Where("video_id = ?", video.Id).Find(&existing).Error; err != nil {
		tx.Rollback()
		return
	}
	// 计算需要新增的条目
	var toCreate []model.VideoCategory
	for _, categoryId := range categoryIds {
		found := false
		for _, vc := range existing {
			if vc.CategoryId == categoryId { // 已存在
				found = true
				break
			}
		}
		if !found { // 缺失，需创建
			toCreate = append(toCreate, model.VideoCategory{
				CategoryId: categoryId,
				VideoId:    video.Id,
			})
		}
	}
	if len(toCreate) > 0 {
		if err := tx.Create(&toCreate).Error; err != nil {
			tx.Rollback()
			return
		}
	}
	// 计算需要删除的条目（数据库多出来的）
	var toDeleteIds []interface{}
	for _, vc := range existing {
		keep := false
		for _, categoryId := range categoryIds {
			if vc.CategoryId == categoryId { // 仍在请求集合中，保留
				keep = true
				break
			}
		}
		if !keep {
			toDeleteIds = append(toDeleteIds, vc.CategoryId)
		}
	}
	if len(toDeleteIds) > 0 {
		if err := tx.Where("video_id = ? AND category_id IN ?", video.Id, toDeleteIds).Delete(&model.VideoCategory{}).Error; err != nil {
			tx.Rollback()
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

func Update(c *gin.Context) {
	// id := c.Query("id")
}
