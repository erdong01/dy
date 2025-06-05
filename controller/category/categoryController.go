package category

import (
	"net/http"
	"video/model"

	"github.com/gin-gonic/gin"
)

func List(c *gin.Context) {
	var categoryModel model.Category
	res := categoryModel.HomeList()
	c.JSON(http.StatusOK, gin.H{
		"Data": res,
	})
}
