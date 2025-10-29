package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"
)

// 定义一个全局的、可复用的HTTP客户端, 设置10秒超时
var httpClient = &http.Client{
	Timeout: 10 * time.Second,
}

// --- 1. 数据结构定义 ---

// VideoData 是最终提交到您自己网站API的数据结构
type VideoData struct {
	Title      string     `json:"Title"`
	Type       int        `json:"Type"`
	Connection int        `json:"Connection"`
	VideoClass VideoClass `json:"VideoClass"`
	VideoUrl   VideoUrl   `json:"VideoUrl"`
	Cover      string     `json:"Cover"`
	URL        string     `json:"Url"`
	Describe   string     `json:"Describe"`
	Category   []Category `json:"Category"`
	Alias      string     `json:"Alias"`
}

// VideoClass 是 VideoData 的内嵌结构体
type VideoClass struct {
	TypeID   int    `json:"TypeId"`
	TypeName string `json:"TypeName"`
	TypePID  int    `json:"TypePid"`
}
type VideoUrl struct {
	Url       string `json:"Url"`       //type:string            comment:地址        version:2025-9-29 09:01
	Proxy     string `json:"Proxy"`     //type:string            comment:代理地址    version:2025-9-29 09:01
	ProxyName string `json:"ProxyName"` //type:string            comment:代理名称    version:2025-9-29 09:56
}

// Category 是 VideoData 的内嵌结构体
type Category struct {
	Type     int           `json:"Type"`
	Name     string        `json:"Name"`
	Category []SubCategory `json:"Category"`
}

// SubCategory 是 Category 的内嵌结构体
type SubCategory struct {
	Name string `json:"Name"`
}

// VideoListResponse 对应影视资源站列表API的响应
type VideoListResponse struct {
	PageCount int         `json:"pagecount"`
	List      []VideoInfo `json:"list"`
}

// VideoDetailResponse 对应影视资源站详情API的响应
type VideoDetailResponse struct {
	List []VideoInfo `json:"list"`
}

// VideoInfo 对应从影视资源站获取的原始视频数据
type VideoInfo struct {
	VodID        int    `json:"vod_id"`
	VodName      string `json:"vod_name"`
	TypeID       int    `json:"type_id"`
	TypeName     string `json:"type_name"`
	TypeID1      int    `json:"type_id_1"`
	VodPic       string `json:"vod_pic"`
	VodPlayURL   string `json:"vod_play_url"`
	VodContent   string `json:"vod_content"`
	VodYear      string `json:"vod_year"`
	VodArea      string `json:"vod_area"`
	VodLang      string `json:"vod_lang"`
	VodActor     string `json:"vod_actor"`
	VodDirector  string `json:"vod_director"`
	VodTag       string `json:"vod_tag"`
	VodClass     string `json:"vod_class"`
	VodSub       string `json:"vod_sub"`
	VodProxyName string `json:"vod_proxy_name,omitempty"`
	VodProxyUrl  string `json:"vod_proxy_url,omitempty"`
}

// --- 2. 主程序逻辑 ---

func main() {
	baseURL := "http://caiji.dyttzyapi.com/api.php/provide/vod/"
	submitURL := "https://api.7x.chat/api/v1/video/create"
	VodProxyName := "电影天堂"
	VodProxyUrl := "https://vip.dyttzyplay.com/?url="
	fmt.Println("程序启动，开始采集数据...")

	fmt.Println("正在获取总页数...")
	firstPageResp, err := fetchVideoList(fmt.Sprintf("%s?ac=list&pg=1", baseURL))
	if err != nil {
		fmt.Println("获取第一页数据失败，无法确定总页数，程序退出:", err)
		return
	}
	totalPages := firstPageResp.PageCount
	fmt.Printf("获取成功，总共有 %d 页数据。\n", totalPages)

	for page := 1; page <= totalPages; page++ {
		fmt.Printf("\n--- 开始处理第 %d 页 / 共 %d 页 ---\n", page, totalPages)

		listResp, err := fetchVideoList(fmt.Sprintf("%s?ac=list&pg=%d", baseURL, page))
		if err != nil {
			fmt.Printf("获取第 %d 页列表失败: %v\n", page, err)
			continue
		}

		for i, video := range listResp.List {
			fmt.Printf("  [%d/%d] 正在处理: %s (ID: %d)\n", i+1, len(listResp.List), video.VodName, video.VodID)

			videoDetail, err := fetchVideoDetail(fmt.Sprintf("%s?ac=detail&ids=%d", baseURL, video.VodID))
			if err != nil {
				fmt.Printf("    获取详情失败: %v\n", err)
				continue
			}
			videoDetail.VodProxyName = VodProxyName
			videoDetail.VodProxyUrl = VodProxyUrl
			postData := transformData(videoDetail)

			err = submitToMyWebsite(submitURL, postData)
			if err != nil {
				fmt.Printf("    提交失败: %v\n", err)
			} else {
				fmt.Printf("    ✅ 成功提交: %s\n", postData.Title)
			}

			time.Sleep(100 * time.Millisecond)
		}
	}

	fmt.Println("\n--- 所有页面处理完毕，程序执行结束 ---")
}

// --- 3. 辅助函数 ---

// fetchVideoList, fetchVideoDetail, submitToMyWebsite 函数保持不变
// ... (这些函数与上一版完全相同)

// transformData 将从资源站获取的数据转换为您自己API需要的格式
func transformData(videoDetail VideoInfo) VideoData {
	return VideoData{
		Title:      videoDetail.VodName,
		Alias:      videoDetail.VodSub,
		Type:       1,
		Connection: 2,
		VideoClass: VideoClass{
			TypeID:   videoDetail.TypeID,
			TypeName: videoDetail.TypeName,
			TypePID:  videoDetail.TypeID1,
		},
		VideoUrl: VideoUrl{
			Url:       videoDetail.VodPlayURL,
			ProxyName: videoDetail.VodProxyName,
			Proxy:     videoDetail.VodProxyUrl,
		},
		Cover:    videoDetail.VodPic,
		Describe: videoDetail.VodContent,
		Category: []Category{
			{Type: 1, Name: "类型", Category: []SubCategory{{Name: videoDetail.VodClass}}},
			{Type: 1, Name: "导演", Category: []SubCategory{{Name: videoDetail.VodDirector}}},
			{Type: 1, Name: "演员", Category: []SubCategory{{Name: videoDetail.VodActor}}},
			{Type: 1, Name: "年代", Category: []SubCategory{{Name: videoDetail.VodYear}}},
			{Type: 1, Name: "地区", Category: []SubCategory{{Name: videoDetail.VodArea}}},
			{Type: 1, Name: "语言", Category: []SubCategory{{Name: videoDetail.VodLang}}},
		},
	}
}

// fetchVideoList 从资源站获取指定页码的视频列表
func fetchVideoList(url string) (VideoListResponse, error) {
	var videoListResponse VideoListResponse

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return videoListResponse, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")

	resp, err := httpClient.Do(req)
	if err != nil {
		return videoListResponse, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return videoListResponse, err
	}

	err = json.Unmarshal(body, &videoListResponse)
	if err != nil {
		fmt.Println("JSON解析失败，服务器返回的原始数据:", string(body))
		return videoListResponse, err
	}

	return videoListResponse, nil
}

// fetchVideoDetail 从资源站获取指定ID的视频详情
func fetchVideoDetail(url string) (VideoInfo, error) {
	var videoDetailResponse VideoDetailResponse
	var videoInfo VideoInfo

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return videoInfo, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")

	resp, err := httpClient.Do(req)
	if err != nil {
		return videoInfo, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return videoInfo, err
	}

	err = json.Unmarshal(body, &videoDetailResponse)
	if err != nil {
		fmt.Println("JSON解析失败，服务器返回的原始数据:", string(body))
		return videoInfo, err
	}

	if len(videoDetailResponse.List) > 0 {
		return videoDetailResponse.List[0], nil
	}

	return videoInfo, fmt.Errorf("API响应的list为空，未找到视频详情")
}

func submitToMyWebsite(url string, data VideoData) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		// 这里增加缩进，让JSON输出更好看
		jsonData, err = json.MarshalIndent(data, "", "  ")
		if err != nil {
			return fmt.Errorf("JSON序列化失败: %v", err)
		}
	}

	// --- 新增的调试代码 ---
	// 在发送前，打印将要提交的JSON内容
	// fmt.Println("--- 准备提交的JSON数据 ---")
	// fmt.Println(string(jsonData))
	// fmt.Println("--------------------------")
	// --- 调试代码结束 ---

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("提交数据失败，状态码: %d, 响应: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
