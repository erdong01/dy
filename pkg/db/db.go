package db

import (
	"fmt"
	"video/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func InitGorm(config config.Mysql) (*gorm.DB, error) {
	mysqlConfig := mysql.Config{
		DSN:                       config.Dsn(), // DSN data source name
		DefaultStringSize:         255,          // string 类型字段的默认长度
		SkipInitializeWithVersion: false,        // 根据版本自动配置
	}

	db, err := gorm.Open(mysql.New(mysqlConfig))
	if err != nil {
		fmt.Printf("gorm connect err:%v", err)
	}
	return db, err
}
