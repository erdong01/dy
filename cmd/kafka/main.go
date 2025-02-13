package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"sync"

	"github.com/IBM/sarama"
)

var brokers = "kmc01.51haitun.cn:10021,kmc02.51haitun.cn:10022,kmc03.51haitun.cn:10023"

// Kafka topic 名称
var topic = "EMS-CUS-DIFF-PUSH-3303960E0K-HW117"

func main() {
	config := sarama.NewConfig()

	config.Consumer.Offsets.Initial = sarama.OffsetOldest
	config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin

	config.Net.SASL.Enable = true
	config.Net.SASL.User = "NEMS3303960E0K"
	config.Net.SASL.Password = "NEMS3303960E0K"
	config.Net.SASL.Mechanism = sarama.SASLTypePlaintext // 或 sarama.SASLTypeSCRAMSHA256, sarama.SASLTypeSCRAMSHA512

	consumerGroup, err := sarama.NewConsumerGroup(strings.Split(brokers, ","), "EMS-3303960E0K", config)
	if err != nil {
		log.Fatalf("Failed to create consumer group: %v", err)
	}
	defer func() {
		if err := consumerGroup.Close(); err != nil {
			log.Println("Failed to close consumer group:", err)
		}
	}()

	// 消费消息
	ctx := context.Background()
	consumer := Consumer{} // 实现 ConsumerGroupHandler 接口
	wg := &sync.WaitGroup{}
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			// `Consume` 应该在一个循环中调用
			if err := consumerGroup.Consume(ctx, []string{topic}, consumer); err != nil {
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

	log.Println("Sarama consumer up and running...")

	// 等待信号 (例如 Ctrl+C)
	sigterm := make(chan os.Signal, 1)
	signal.Notify(sigterm, os.Interrupt)
	select {
	case <-ctx.Done():
		log.Println("terminating: context cancelled")
		wg.Done()
	case <-sigterm:
		log.Println("terminating: via signal")
		wg.Done()
	}

	wg.Wait() // 等待消费者goroutine退出
}

// Consumer 结构体，实现 ConsumerGroupHandler 接口
type Consumer struct {
	// ... 可以添加一些状态或配置 ...
}

// Setup is run at the beginning of a new session, before ConsumeClaim
func (consumer Consumer) Setup(sarama.ConsumerGroupSession) error {
	// Mark the consumer as ready
	// close(consumer.ready)
	fmt.Println("setup")
	return nil
}

// Cleanup is run at the end of a session, once all ConsumeClaim goroutines have exited
func (consumer Consumer) Cleanup(sarama.ConsumerGroupSession) error {
	fmt.Println("Cleanup")
	return nil
}

// ConsumeClaim must start a consumer loop of ConsumerGroupClaim's Messages().
func (consumer Consumer) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	// NOTE:
	// Do not move the code below to a goroutine.
	// The `ConsumeClaim` itself is called within a goroutine, see:
	// https://github.com/IBM/sarama/blob/main/consumer_group.go#L27-L29
	for {
		select {
		case message, ok := <-claim.Messages():
			if !ok {
				log.Printf("message channel was closed")
				return nil
			}
			log.Printf("Message claimed: value = %s, timestamp = %v, topic = %s", string(message.Value), message.Timestamp, message.Topic)
			session.MarkMessage(message, "") // 标记消息已处理
		case <-session.Context().Done(): // 如果 session context 被取消，则退出循环
			return nil

		}
	}
}
