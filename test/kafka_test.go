package test

import (
	"fmt"
	"testing"
	"time"
)

// Kafka brokers 地址
var brokers = "kmc01.51haitun.cn:10021,kmc02.51haitun.cn:10022,kmc03.51haitun.cn:10023"

// Kafka topic 名称
var topic = "EMS-CUS-DIFF-PUSH-3303960E0K-HW117"

func TestKafka(t *testing.T) {
	var arr = []int{0, 1, 2, 3}

	fmt.Println(arr[len(arr)-1])
}

func TestGo(t *testing.T) {

	TGo(func() {
		fmt.Println("go go")
	})
	time.Sleep(time.Second)
}

func TGo(f func()) {

	go f()
}
