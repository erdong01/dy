package config

type Mysql struct {
	Path         string
	Port         string
	Username     string
	Password     string
	Dbname       string
	Config       string
	MaxIdleConns int
	MaxOpenConns int
	Singular     bool
	Prefix       string
	LogMode      string
	// Migration     bool
	// MigrationPath string
}

func (m *Mysql) Dsn() string {
	return m.Username + ":" + m.Password + "@tcp(" + m.Path + ":" + m.Port + ")/" + m.Dbname + "?" + m.Config + "&loc=Local"
}

func (m *Mysql) GetLogMode() string {
	return m.LogMode
}

type Dbs struct {
	AliasName string  `json:"AliasName,optional" yaml:"AliasName,optional"`
	Sources   []Mysql `json:"Sources,optional" yaml:"Sources,optional"`
	Replicas  []Mysql `json:"Replicas,optional" yaml:"Replicas,optional"`
}

type ShardingConfig struct {
	// When DoubleWrite enabled, data will double write to both main table and sharding table.
	DoubleWrite bool

	// ShardingKey specifies the table column you want to used for sharding the table rows.
	// For example, for a product order table, you may want to split the rows by `user_id`.
	ShardingKey string

	// NumberOfShards specifies how many tables you want to sharding.
	NumberOfShards uint

	PrimaryKeyGenerator int
}
