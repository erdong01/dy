package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"video/core"
	"video/model"

	"github.com/gin-gonic/gin"
)

func List(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println(r)
		}
	}()
	var err error
	page, err := strconv.Atoi(c.Query("Page"))
	if err != nil {
		return
	}
	pageSize, err := strconv.Atoi(c.Query("PageSize"))
	if err != nil {
		return
	}
	id, err := strconv.ParseInt(c.Query("Id"), 10, 64)
	if err != nil {
		return
	}
	keyWord := c.Query("KeyWord")

	var video model.Video
	data, total, err := video.List(page, pageSize, id, keyWord)
	if err != nil {
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
	if data.VideoGroupId > 0 {
		data.VideoList = video.ListByVideoGroupId(data.VideoGroupId)
	}
	c.JSON(http.StatusOK, gin.H{
		"Data": data,
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
	cc := model.Category{}
	categoryIds := cc.Create(*video.Category[0].Type, video.Category)
	video.VideoGroup.Edit()
	if video.VideoGroup.Id > 0 {
		video.VideoGroupId = video.VideoGroup.Id
	}
	err = video.Create()
	if err != nil {
		return
	}
	var videoCategoryArr []model.VideoCategory
	for _, categoryId := range categoryIds {
		videoCategoryArr = append(videoCategoryArr, model.VideoCategory{
			CategoryId: categoryId,
			VideoId:    video.Id,
		})
	}
	core.New().DB.Create(&videoCategoryArr)
	c.JSON(http.StatusOK, gin.H{})
}

func Update(c *gin.Context) {
	// id := c.Query("id")

}
