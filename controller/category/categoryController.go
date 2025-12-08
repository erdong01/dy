package category

import (
	"fmt"
	"net/http"
	"strconv"
	"video/model"

	"github.com/gin-gonic/gin"
)

func List(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println(r)
		}
	}()
	var typeId int64
	typeIdStr := c.Query("TypeId")
	if typeIdStr != "" {
		typeId, _ = strconv.ParseInt(typeIdStr, 10, 64)
	}
	var categoryModel model.Category
	res := categoryModel.HomeList(typeId)
	c.JSON(http.StatusOK, gin.H{
		"Data": res,
	})
}
