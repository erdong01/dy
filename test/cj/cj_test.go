package cj

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"testing"
)

// 1. 定义源API的数据结构 (caiji.dyttzyapi.com)
//======================================================================

// MaccmsResponse 是源API返回的完整结构
type MaccmsResponse struct {
	Code int           `json:"code"`
	Msg  string        `json:"msg"`
	List []VideoDetail `json:"list"`
}

// VideoDetail 是源视频数据的详细结构
type VideoDetail struct {
	VodID       int    `json:"vod_id"`
	VodName     string `json:"vod_name"`
	VodPic      string `json:"vod_pic"`
	VodBlurb    string `json:"vod_blurb"`     // 简介
	VodRemarks  string `json:"vod_remarks"`   // 状态备注，如：HD中字
	VodClass    string `json:"vod_class"`     // 类型，用,分隔
	VodActor    string `json:"vod_actor"`     // 演员，用,分隔
	VodDirector string `json:"vod_director"`  // 导演
	VodArea     string `json:"vod_area"`      // 地区
	VodLang     string `json:"vod_lang"`      // 语言
	VodYear     string `json:"vod_year"`      // 年代
	VodPlayFrom string `json:"vod_play_from"` // 播放来源，用$$$分隔
	VodPlayURL  string `json:"vod_play_url"`  // 播放地址，用$$$分隔
	VodSub      string `json:"vod_sub"`       // 播放地址，用$$$分隔
}

// 2. 定义你自己的API的数据结构 (api.7x.chat)
//======================================================================

// MyVideoCreatePayload 是提交到你自己API的请求体结构
type MyVideoCreatePayload struct {
	Title      string          `json:"Title"`
	Connection int             `json:"Connection"`
	Cover      string          `json:"Cover"`
	URL        string          `json:"Url"`
	Describe   string          `json:"Describe"`
	Alias      string          `json:"Alias"`
	Category   []CategoryGroup `json:"Category"`
}

// CategoryGroup 对应你API中的每个分类大项
type CategoryGroup struct {
	Type     int            `json:"Type"`
	Name     string         `json:"Name"`
	Category []CategoryItem `json:"Category"`
}

// CategoryItem 对应分类中的具体条目
type CategoryItem struct {
	Name string `json:"Name"`
}

// 3. 核心逻辑实现
//======================================================================

// extractM3u8URL 从复杂的播放地址字符串中提取M3U8链接
func extractM3u8URL(from, urls string) (string, error) {
	froms := strings.Split(from, "$$$")
	urlGroups := strings.Split(urls, "$$$")

	if len(froms) != len(urlGroups) {
		return "", fmt.Errorf("播放来源和播放地址数量不匹配")
	}

	for i, f := range froms {
		if strings.Contains(f, "m3u8") {
			// 播放地址格式通常是 "清晰度$链接"
			parts := strings.Split(urlGroups[i], "$")
			if len(parts) == 2 {
				return parts[1], nil // 返回链接部分
			}
		}
	}
	// 如果没有找到m3u8，就返回第一个有效的链接
	if len(urlGroups) > 0 {
		parts := strings.Split(urlGroups[0], "$")
		if len(parts) == 2 {
			return parts[1], nil
		}
	}

	return "", fmt.Errorf("未找到有效的播放链接")
}

// transformData 将源数据转换为你的API格式
func transformData(source VideoDetail) (*MyVideoCreatePayload, error) {
	// 提取播放链接
	playURL, err := extractM3u8URL(source.VodPlayFrom, source.VodPlayURL)
	if err != nil {
		return nil, fmt.Errorf("处理视频 %s 时出错: %v", source.VodName, err)
	}

	// 构建分类信息
	categories := []CategoryGroup{
		{Type: 1, Name: "状态", Category: []CategoryItem{{Name: source.VodRemarks}}},
		{Type: 1, Name: "导演", Category: []CategoryItem{{Name: source.VodDirector}}},
		{Type: 1, Name: "演员", Category: []CategoryItem{{Name: source.VodActor}}},
		{Type: 1, Name: "年代", Category: []CategoryItem{{Name: source.VodYear}}},
		{Type: 1, Name: "地区", Category: []CategoryItem{{Name: source.VodArea}}},
		{Type: 1, Name: "语言", Category: []CategoryItem{{Name: source.VodLang}}},
	}

	// 处理“类型”，因为它可能有多个值
	var genreItems []CategoryItem
	genres := strings.Split(source.VodClass, ",")
	for _, g := range genres {
		if g != "" {
			genreItems = append(genreItems, CategoryItem{Name: g})
		}
	}
	categories = append(categories, CategoryGroup{Type: 1, Name: "类型", Category: genreItems})

	// 组装最终数据
	payload := &MyVideoCreatePayload{
		Title:      source.VodName,
		Connection: 2, // 根据你的示例，固定为2
		Cover:      source.VodPic,
		URL:        playURL,
		Describe:   source.VodBlurb,
		Category:   categories,
	}

	return payload, nil
}

func TestAA(t *testing.T) {

	// --- 步骤 1: 从源API获取数据 ---
	sourceURL := "http://caiji.dyttzyapi.com/api.php/provide/vod/?ac=detail&ids=61812"
	log.Printf("正在从源API抓取数据: %s", sourceURL)
	client := &http.Client{}
	req, err := http.NewRequest("GET", sourceURL, nil)
	if err != nil {
		log.Fatalf("请求源API失败: %v", err)
	}
	// 设置一个看起来像浏览器的 User-Agent
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")

	// 如果需要，也可以设置其他头部信息
	// req.Header.Set("Authorization", "Bearer YOUR_API_KEY") // 示例：添加认证Token
	// req.Header.Set("Referer", "http://some-trusted-site.com") // 示例：添加Referer

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("请求源API失败: %v", err)
		return
	}
	defer resp.Body.Close()
	fmt.Println(resp)
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("源API返回错误状态码: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("读取源API响应体失败: %v", err)
	}

	var maccmsResp MaccmsResponse
	if err := json.Unmarshal(body, &maccmsResp); err != nil {
		log.Fatalf("解析源API JSON数据失败: %v", err)
	}

	if maccmsResp.Code != 1 || len(maccmsResp.List) == 0 {
		log.Fatalf("源API未返回有效视频数据, 消息: %s", maccmsResp.Msg)
	}

	sourceVideo := maccmsResp.List[0]
	log.Printf("成功抓取到视频: 《%s》", sourceVideo.VodName)

	// --- 步骤 2: 转换数据 ---
	log.Println("正在将数据转换为目标格式...")
	myPayload, err := transformData(sourceVideo)

	if err != nil {
		log.Fatalf("数据转换失败: %v", err)
	}
	log.Println("数据转换成功!")
	myPayloadJson, _ := json.Marshal(myPayload)
	fmt.Println(string(myPayloadJson))

	// --- 步骤 3: 提交到你自己的API ---
	targetURL := "https://api.7x.chat/api/v1/video/create"
	// targetURL := "http://127.0.0.1:9090/api/v1/video/create"
	log.Printf("正在提交数据到你的API: %s", targetURL)

	payloadBytes, err := json.MarshalIndent(myPayload, "", "    ") // 使用 MarshalIndent 格式化输出，方便调试
	if err != nil {
		log.Fatalf("序列化目标JSON失败: %v", err)
	}

	// 打印将要发送的JSON，用于调试检查
	// fmt.Println("将要发送的JSON数据:\n", string(payloadBytes))

	postReq, err := http.NewRequest("POST", targetURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Fatalf("创建POST请求失败: %v", err)
	}

	// 设置请求头
	postReq.Header.Set("Content-Type", "application/json")
	// 如果你的API需要认证，在这里添加认证头
	// postReq.Header.Set("Authorization", "Bearer YOUR_API_TOKEN")

	client2 := &http.Client{}
	postResp, err := client2.Do(postReq)
	if err != nil {
		log.Fatalf("提交到你的API失败: %v", err)
	}
	defer postResp.Body.Close()

	log.Printf("成功提交数据, 你的API返回状态码: %d", postResp.StatusCode)

	// 读取并打印你API的返回结果
	postRespBody, _ := io.ReadAll(postResp.Body)
	log.Println("你的API返回内容:", string(postRespBody))
}
