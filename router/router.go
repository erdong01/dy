package router

import (
	"video/controller"
	"video/controller/category"

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
	apiRouter := Router.Group("/v1").Group("/video")
	{
		apiRouter.POST("/create", controller.Create) //
		apiRouter.POST("/update", controller.Update) //
		apiRouter.GET("/list", controller.List)      //
		apiRouter.GET("/get", controller.Get)        //
	}

	categoryRouter := that.Router.Group("/v1").Group("/category")
	{
		categoryRouter.GET("/list", category.List) //
	}
}
