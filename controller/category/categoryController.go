package category

import (
	"fmt"
	"net/http"
	"video/model"

	"github.com/gin-gonic/gin"
)

func List(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println(r)
		}
	}()
	typeId := c.GetInt64("TypeId")
	var categoryModel model.Category
	res := categoryModel.HomeList(typeId)
	c.JSON(http.StatusOK, gin.H{
		"Data": res,
	})
}
