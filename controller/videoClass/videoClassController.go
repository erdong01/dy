package videoClass

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
	var videoClass model.VideoClass
	res := videoClass.List()
	c.JSON(http.StatusOK, res)
}
