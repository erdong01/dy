package controller

import (
	"net/http"
	"strconv"
	"video/model"

	"github.com/gin-gonic/gin"
)

func List(c *gin.Context) {
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
	var video model.Video
	data, total, err := video.List(page, pageSize, id)
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
	id, err := strconv.ParseInt(c.Query("Id"), 10, 64)
	if err != nil {
		return
	}
	var video model.Video
	data, err := video.Get(id)
	if err != nil {
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"Data": data,
	})
}

func Create(c *gin.Context) {
	var video model.Video
	err := c.BindJSON(&video)
	if err != nil {

		return
	}
	video.Create()

	c.JSON(http.StatusOK, gin.H{})

}

func Update(c *gin.Context) {
	// id := c.Query("id")

}
