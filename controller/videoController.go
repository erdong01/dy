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
	var typeId int64
	if typeIdStr := c.Query("TypeId"); typeIdStr != "" {
		typeId, _ = strconv.ParseInt(typeIdStr, 10, 64)
	}

	keyWord := c.Query("KeyWord")

	var video model.Video
	data, total, err := video.List(page, pageSize, id, keyWord, categoryId, typeId)
	if err != nil {
		fmt.Println("List error:", err)
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
		c.JSON(http.StatusNotFound, nil)
		return
	}
	var video model.Video
	data, err := video.Get(id)
	if err != nil {
		c.JSON(http.StatusNotFound, nil)
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		}
	}()
	var video model.Video
	err := c.BindJSON(&video)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	tx := core.New().DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database Error"})
		return
	}

	// Ensure rollback on panic
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	if err := video.VideoClass.Create(tx); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create video class"})
		return
	}

	video.TypeId = video.VideoClass.TypeId
	video.TypePid = video.VideoClass.TypePid
	cc := model.Category{}
	var categoryIds []int64
	if len(video.Category) > 0 && video.Category[0].Type != nil {
		categoryIds = cc.Create(tx, *video.Category[0].Type, video.Category, video.VideoClass)
	}

	video.VideoGroup.Edit(tx)
	if video.VideoGroup.Id > 0 {
		video.VideoGroupId = video.VideoGroup.Id
	}
	err = video.Create(tx)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create video"})
		return
	}
	video.VideoUrl.VideoId = video.Id
	if err := video.VideoUrl.Create(tx); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create video url"})
		return
	}
	// 同步 Video-Category 关联：已存在不创建、缺失则新增、多余则删除
	// 查询当前已存在的关联
	var existing []model.VideoCategory
	if err := tx.Where("video_id = ?", video.Id).Find(&existing).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query existing categories"})
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create video categories"})
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete old categories"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction Commit Failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

func Update(c *gin.Context) {
	// id := c.Query("id")
}
