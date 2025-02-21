package kafka

import (
	"context"
	"errors"
	"log"
	"video/core"

	"github.com/IBM/sarama"
)

func ConsumerInit(ctx context.Context, consumer sarama.ConsumerGroupHandler) (err error) {
	configGlobal := core.New().ConfigGlobal

	config := sarama.NewConfig()

	config.Consumer.Offsets.Initial = sarama.OffsetOldest
	config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin

	config.Net.SASL.Enable = true
	config.Net.SASL.User = configGlobal.Kafka.User
	config.Net.SASL.Password = configGlobal.Kafka.Password
	config.Net.SASL.Mechanism = sarama.SASLTypePlaintext // 或 sarama.SASLTypeSCRAMSHA256, sarama.SASLTypeSCRAMSHA512

	consumerGroup, err := sarama.NewConsumerGroup(configGlobal.Kafka.Brokers, configGlobal.Kafka.GroupId, config)
	if err != nil {
		log.Fatalf("Failed to create consumer group: %v", err)
	}
	go func() {
		defer func() {
			if err := consumerGroup.Close(); err != nil {
				log.Println("Failed to close consumer group:", err)
			}
		}()
		for {
			// `Consume` 应该在一个循环中调用
			if err := consumerGroup.Consume(ctx, []string{configGlobal.Kafka.Topic}, consumer); err != nil {
				if errors.Is(err, sarama.ErrClosedConsumerGroup) { // 正常关闭
					return
				}
				log.Printf("Error from consumer: %v", err)
			}
			// 如果 context 被取消了，退出循环
			if ctx.Err() != nil {
				return
			}
		}
	}()

	return
}
