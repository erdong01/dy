package config

type RedisConfig struct {
	Db       int    // redis的哪个数据库
	Addr     string // 服务器地址:端口
	Password string `json:",optional"`
}

type RedisCluster struct {
	Password string   `json:",optional"` // 密码
	Addrs    []string // 服务器地址:端口
}
