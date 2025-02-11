package core

import (
	"sync"
	"video/config"
	"video/pkg/db"

	"github.com/redis/go-redis/v9"
)

var C *Core
var one sync.Once

type Core struct {
	Redis        redis.Cmdable
	RedisCluster redis.Cmdable
	Jwt          config.UserJwt
	ConfigGlobal config.ConfigGlobal
	DB           *db.Dbs
}

func New() *Core {
	one.Do(func() {
		C = &Core{}
	})
	return C
}

func (c *Core) InitRedis(client redis.Cmdable) {
	c.Redis = client
}

func (c *Core) InitRedisCluster(client redis.Cmdable) {
	c.Redis = client
}
