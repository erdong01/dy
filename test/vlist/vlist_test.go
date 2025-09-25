package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"testing"
	"time"
)

// --- 数据结构体 ---

type SourceResponse struct {
	List []SourceVideo `json:"list"`
}
type SourceVideo struct {
	VodID       int    `json:"vod_id"`
	VodName     string `json:"vod_name"`
	VodSub      string `json:"vod_sub"` // <<< 1. 新增字段，用于接收 vod_sub
	TypeName    string `json:"type_name"`
	VodPic      string `json:"vod_pic"`
	VodActor    string `json:"vod_actor"`
	VodDirector string `json:"vod_director"`
	VodYear     string `json:"vod_year"`
	VodArea     string `json:"vod_area"`
	VodLang     string `json:"vod_lang"`
	VodContent  string `json:"vod_content"`
	VodPlayURL  string `json:"vod_play_url"`
	VodRemarks  string `json:"vod_remarks"`
}
type TargetPayload struct {
	Connection int             `json:"Connection"`
	Title      string          `json:"Title"`
	Alias      string          `json:"Alias"` // <<< 2. 新增字段，用于提交 Alias
	Cover      string          `json:"Cover"`
	Url        string          `json:"Url"`
	Describe   string          `json:"Describe"`
	VideoGroup VideoGroup      `json:"VideoGroup"`
	Category   []CategoryGroup `json:"Category"`
}
type VideoGroup struct {
	Title string `json:"Title"`
}
type CategoryGroup struct {
	Type     int        `json:"Type"`
	Name     string     `json:"Name"`
	Category []Category `json:"Category"`
}
type Category struct {
	Name string `json:"Name"`
}

// 定义全局的 UserAgent 和 HTTP Client
var (
	userAgent  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
	httpClient = &http.Client{Timeout: 15 * time.Second}
)

func TestMain(t *testing.T) {
	sourceURL := "http://caiji.dyttzyapi.com/api.php/provide/vod/?ac=detail&ids=64897"
	// targetAPIURL := "http://127.0.0.1:9090/api/v1/video/create"
	targetAPIURL := "https://api.7x.chat/api/v1/video/create"

	log.Println("开始从源API抓取数据...")
	sourceVideo, err := fetchSourceData(sourceURL)
	if err != nil {
		log.Fatalf("抓取源数据失败: %v", err)
	}
	log.Printf("成功获取视频: %s (别名: %s)", sourceVideo.VodName, sourceVideo.VodSub)

	playSources := strings.Split(sourceVideo.VodPlayURL, "$$$")
	var m3u8Playlist string

	for _, source := range playSources {
		if strings.Contains(source, ".m3u8") {
			m3u8Playlist = source
			break
		}
	}

	if m3u8Playlist == "" {
		log.Fatalf("错误: 在 %s 的数据中未找到 .m3u8 播放列表。", sourceVideo.VodName)
	}

	log.Println("已成功定位到 .m3u8 播放列表。")

	episodes := strings.Split(m3u8Playlist, "#")
	log.Printf("共找到 %d 个 .m3u8 视频链接，准备提交...", len(episodes))

	for i, episode := range episodes {
		if episode == "" {
			continue
		}

		parts := strings.Split(episode, "$")
		if len(parts) != 2 {
			log.Printf("警告: 第 %d 条播放数据格式不正确，已跳过: %s", i+1, episode)
			continue
		}
		episodeName := parts[0]
		episodeURL := parts[1]

		if !strings.HasSuffix(episodeURL, ".m3u8") {
			log.Printf("警告: 第 %d 条链接不是 .m3u8 格式，已跳过: %s", i+1, episodeURL)
			continue
		}

		payload := buildTargetPayload(sourceVideo, episodeName, episodeURL)

		log.Printf("正在提交: [%s]", payload.Title)
		err := postToTargetAPI(targetAPIURL, payload)
		if err != nil {
			log.Printf("提交失败: [%s], 错误: %v", payload.Title, err)
		} else {
			log.Printf("提交成功: [%s]", payload.Title)
		}
		time.Sleep(200 * time.Millisecond)
	}
	log.Println("所有任务处理完成！")
}

// fetchSourceData 函数 (无需修改)
func fetchSourceData(url string) (*SourceVideo, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("User-Agent", userAgent)
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求源API失败: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("源API返回非200状态码: %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应体失败: %w", err)
	}
	var sourceResponse SourceResponse
	if err := json.Unmarshal(body, &sourceResponse); err != nil {
		return nil, fmt.Errorf("解析JSON失败: %w", err)
	}
	if len(sourceResponse.List) == 0 {
		return nil, fmt.Errorf("源API返回的数据列表为空")
	}
	return &sourceResponse.List[0], nil
}

// buildTargetPayload 函数
func buildTargetPayload(video *SourceVideo, episodeName, episodeURL string) *TargetPayload {
	title := video.VodName
	if episodeName != "全集" && episodeName != "" && !strings.Contains(video.VodName, episodeName) {
		title = fmt.Sprintf("%s %s", video.VodName, episodeName)
	}

	re := strings.NewReplacer("<p>", "", "</p>", "", "<span>", "", "</span>", "")
	description := re.Replace(video.VodContent)

	return &TargetPayload{
		Connection: 2,
		Title:      title,
		Alias:      video.VodSub, // <<< 3. 添加 Alias 字段映射
		Cover:      video.VodPic,
		Url:        episodeURL,
		Describe:   description,
		VideoGroup: VideoGroup{Title: video.VodName},
		Category: []CategoryGroup{
			{Type: 1, Name: "状态", Category: []Category{{Name: video.VodRemarks}}},
			{Type: 1, Name: "类型", Category: []Category{{Name: video.TypeName}}},
			{Type: 1, Name: "导演", Category: []Category{{Name: video.VodDirector}}},
			{Type: 1, Name: "演员", Category: []Category{{Name: video.VodActor}}},
			{Type: 1, Name: "年代", Category: []Category{{Name: video.VodYear}}},
			{Type: 1, Name: "地区", Category: []Category{{Name: video.VodArea}}},
			{Type: 1, Name: "语言", Category: []Category{{Name: video.VodLang}}},
		},
	}
}

// postToTargetAPI 函数 (无需修改)
func postToTargetAPI(url string, payload *TargetPayload) error {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("序列化Payload为JSON失败: %w", err)
	}
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("创建POST请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", userAgent)
	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("发送POST请求失败: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("目标API返回错误状态码: %d, 响应: %s", resp.StatusCode, string(body))
	}
	return nil
}
