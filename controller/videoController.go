package controller

import (
	"video/model"

	"github.com/gin-gonic/gin"
)

func List(c *gin.Context) {
	// id := c.Query("id")

}
func Get(c *gin.Context) {
	// id := c.Query("id")

}

func Create(c *gin.Context) {
	var video model.Video
	err := c.BindJSON(&video)
	if err != nil {

		return
	}

}

func Update(c *gin.Context) {
	// id := c.Query("id")

}
