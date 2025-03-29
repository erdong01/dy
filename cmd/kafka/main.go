package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"sync"
	"time"
	"video/config"
	"video/core"
	"video/pkg/kafka"

	"github.com/IBM/sarama"
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
	var configGlobal config.ConfigGlobal
	if err := viper.Unmarshal(&configGlobal); err != nil {
		fmt.Printf("Unable to decode into struct, %v", err)
		return
	}
	core.New().ConfigGlobal = configGlobal

	// 消费消息
	ctx, cancel := context.WithCancel(context.Background())
	consumer := Consumer{} // 实现 ConsumerGroupHandler 接口
	kafka.ConsumerInit(ctx, consumer)
	wg := &sync.WaitGroup{}
	wg.Add(1)

	log.Println("Sarama consumer up and running...")
	// 等待信号 (例如 Ctrl+C)
	sigterm := make(chan os.Signal, 1)
	signal.Notify(sigterm, os.Interrupt)
	select {
	case <-ctx.Done():
		log.Println("terminating: context cancelled")
		wg.Done()
	case <-sigterm:
		cancel()
		log.Println("terminating: via signal")
		time.Sleep(10 * time.Second) // 等待消费者goroutine退出
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

			// 将 message.Value 写入 JSON 文件
			var jsonData map[string]interface{}
			if err := json.Unmarshal(message.Value, &jsonData); err != nil {
				log.Printf("Error unmarshalling message value: %v", err)
			} else {
				fileName := fmt.Sprintf("message_%v.json", message.Timestamp.Unix())
				fileData, err := json.MarshalIndent(jsonData, "", "  ")
				if err != nil {
					log.Printf("Error marshalling JSON data: %v", err)
				} else {
					if err := os.WriteFile(fileName, fileData, 0644); err != nil {
						log.Printf("Error writing JSON file: %v", err)
					}
				}
			}

			session.MarkMessage(message, "") // 标记消息已处理
		case <-session.Context().Done(): // 如果 session context 被取消，则退出循环
			return nil

		}
	}
}
