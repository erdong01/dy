package config

type ConfigGlobal struct {
	Mysql       Mysql
	RedisConfig RedisConfig
	Elastic     Elastic
	RabbitMq    RabbitMq
	Gorse       Gorse
}
type UserJwt struct {
	SSO           bool
	Secret        string
	Expire        int64
	RefreshExpire int64
}

type AvatarPool []string
