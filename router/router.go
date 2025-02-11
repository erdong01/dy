package router

import (
	"video/controller"

	"github.com/gin-gonic/gin"
)

var RouterGroupApp = new(RouterGroup)

type RouterGroup struct {
	ApiRouter ApiRouter
}

type ApiRouter struct {
	Router *gin.RouterGroup
}

func (that *ApiRouter) InitApiRouter(Router *gin.RouterGroup) {
	that.Router = Router
	apiRouter := Router.Group("/v1")

	{
		apiRouter.GET("/dy", controller.Get) // 配置渠道详情
	}

}
