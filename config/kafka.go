package config

type Kafka struct {
	User     string
	Password string
	Brokers  []string
	GroupId  string
	Topic    string
}
