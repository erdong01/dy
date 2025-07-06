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
	var categoryModel model.Category
	res := categoryModel.HomeList()
	c.JSON(http.StatusOK, gin.H{
		"Data": res,
	})
}
