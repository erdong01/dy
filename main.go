package main

import (
	"fmt"
	"net/http"
	"video/config"
	"video/core"
	"video/middlewares"
	"video/pkg/db"
	"video/router"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

func main() {

	viper.SetConfigName("config") // name of config file (without extension)
	viper.SetConfigType("yaml")   // REQUIRED if the config file does not have the extension in the name
	viper.AddConfigPath("etc/")   // path to look for the config file in
	err := viper.ReadInConfig()   // Find and read the config file
	if err != nil {               // Handle errors reading the config file
		panic(fmt.Errorf("fatal error config file: %w", err))
	}
	var config config.ConfigGlobal
	if err := viper.Unmarshal(&config); err != nil {
		fmt.Printf("Unable to decode into struct, %v", err)
		return
	}
	core.New().ConfigGlobal = config
	err = db.NewDBS().InitGorm(config.Mysql)
	if err != nil {
		return
	}
	core.New().DB = db.DBS
	r := gin.Default()
	r.Use(middlewares.Cors())
	router.RouterGroupApp.ApiRouter.InitApiRouter(r.Group("/api"))
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	r.Run(":9191")
}
