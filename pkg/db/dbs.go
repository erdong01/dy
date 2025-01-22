package db

import (
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"video/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"gorm.io/plugin/dbresolver"
	"gorm.io/sharding"
)

type DB struct {
	*gorm.DB
}

func Init(dbs []config.Dbs, d any) (db *DB, err error) {
	for _, configs := range dbs {
		db, _ := InitGorm(configs.Sources[0])
		SetDB(d, configs.AliasName, db)
	}
	return
}
func (*DB) ShardingRegister(db *gorm.DB, shardingConfig sharding.Config, tableName []any) {
	err := db.Use(sharding.Register(shardingConfig, tableName...))
	if err != nil {
		panic(err)
	}
}
func (*DB) DbResolverRegister(db *gorm.DB, configs config.Dbs) {
	var sources = []gorm.Dialector{}
	for index, config := range configs.Sources {
		if index == 0 {
			continue
		}
		mysqlConfig := mysql.Config{
			DSN:                       config.Dsn(), // DSN data source name
			DefaultStringSize:         191,          // string 类型字段的默认长度
			SkipInitializeWithVersion: false,        // 根据版本自动配置
		}
		sources = append(sources, mysql.New(mysqlConfig))
	}
	var replicas = []gorm.Dialector{}
	for _, config := range configs.Replicas {
		mysqlConfig := mysql.Config{
			DSN:                       config.Dsn(), // DSN data source name
			DefaultStringSize:         191,          // string 类型字段的默认长度
			SkipInitializeWithVersion: false,        // 根据版本自动配置
		}
		replicas = append(replicas, mysql.New(mysqlConfig))
	}
	db.Use(dbresolver.Register(dbresolver.Config{
		Sources:           sources,
		Replicas:          replicas,
		Policy:            dbresolver.RandomPolicy{},
		TraceResolverMode: true,
	}))
}
func (d *DB) InitShardingRegister(db *gorm.DB, shardingConfig config.ShardingConfig, models ...schema.Tabler) {
	sprintfCount := countDigits(int(shardingConfig.NumberOfShards))
	var tableName []any
	for _, model := range models {
		for i := 0; i < int(shardingConfig.NumberOfShards); i++ {
			tableName := fmt.Sprintf(model.TableName()+"_%0*d", sprintfCount, i) //表名
			db.Table(tableName).AutoMigrate(model)
		}
		tableName = append(tableName, model.TableName())
	}
	d.ShardingRegister(db, sharding.Config{
		DoubleWrite:         shardingConfig.DoubleWrite,
		ShardingKey:         shardingConfig.ShardingKey,
		NumberOfShards:      shardingConfig.NumberOfShards,
		PrimaryKeyGenerator: shardingConfig.PrimaryKeyGenerator,
	}, tableName)
}
func countDigits(num int) int {
	// 将整数转换为字符串
	numStr := strconv.Itoa(num)
	// 获取字符串的长度（即数字的位数）
	digitCount := len(numStr)
	return digitCount
}

// SetDB uses reflection to assign a *gorm.DB value to the specified field of Dbs
func SetDB(d any, fieldName string, db *gorm.DB) error {
	// Check if the Dbs struct is nil
	if d == nil {
		return errors.New("Dbs struct is nil")
	}

	// Check if the gorm.DB pointer is nil
	if db == nil {
		return errors.New("gorm.DB pointer is nil")
	}

	// Get the reflect.Value of d
	v := reflect.ValueOf(d).Elem()

	// Ensure the specified field exists
	fieldVal := v.FieldByName(fieldName)
	if !fieldVal.IsValid() {
		return errors.New("field does not exist")
	}

	// Ensure the field can be set
	if !fieldVal.CanSet() {
		return errors.New("cannot set field")
	}

	// Ensure the field is of the correct types
	if fieldVal.Type() != reflect.TypeOf(db) {
		return errors.New("provided value types does not match field types")
	}

	// Set the field
	fieldVal.Set(reflect.ValueOf(db))
	return nil
}

var DBS *Dbs

type Dbs struct {
	DB
	// User    *gorm.DB
	// Order   *gorm.DB
	// Account *gorm.DB
}

func NewDBS() *Dbs {
	if DBS == nil {
		DBS = &Dbs{}
	}
	return DBS
}

// func (d *Dbs) InitDBS(dbs []config.Dbs, ServiceConf service.ServiceConf) {
// 	Init(dbs, d, ServiceConf)
// 	d.InitShardingRegister(d.User, config.ShardingConfig{
// 		ShardingKey:         "mobile",
// 		NumberOfShards:      64,
// 		PrimaryKeyGenerator: sharding.PKSnowflake,
// 	}, &model.User{})
// 	d.InitShardingRegister(d.Account, config.ShardingConfig{
// 		ShardingKey:         "user_id",
// 		NumberOfShards:      64,
// 		PrimaryKeyGenerator: sharding.PKSnowflake,
// 	}, &model.Account{})
// }

func (d *Dbs) InitGorm(config config.Mysql) {
	d.DB.DB, _ = InitGorm(config)
}
