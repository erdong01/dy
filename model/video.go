package model

import (
	"regexp"
	"strings"
	"time"
	"unicode"

	"video/core"

	"gorm.io/gorm"
)

type Video struct {
	Id           int64           `gorm:"column:id;primaryKey" json:"Id"`            //type:int64        comment:              version:2025-00-22 15:16
	CreatedAt    *time.Time      `gorm:"column:created_at" json:"CreatedAt"`        // type:*time.Time   comment:创建时间      version:2025-00-22 15:16
	UpdatedAt    *time.Time      `gorm:"column:updated_at" json:"UpdatedAt"`        // type:*time.Time   comment:更新时间      version:2025-00-22 15:16
	DeletedAt    *gorm.DeletedAt `gorm:"column:deleted_at" json:"DeletedAt"`        // type:*time.Time   comment:删除时间      version:2025-00-22 15:16
	Title        string          `gorm:"column:title" json:"Title"`                 //type:string       comment:标题          version:2025-00-22 15:16
	Alias        string          `gorm:"column:alias" json:"Alias"`                 //type:string            comment:别名                    version:2025-05-06 07:26
	Describe     string          `gorm:"column:describe" json:"Describe"`           //type:string            comment:描述          version:2025-01-18 22:36
	Connection   *int            `gorm:"column:connection" json:"Connection"`       // type:*int         comment:连接方式      version:2025-00-22 15:16
	Url          string          `gorm:"column:url" json:"Url"`                     //type:string       comment:连接地址      version:2025-00-22 15:16
	Cover        string          `gorm:"column:cover" json:"Cover"`                 //type:string       comment:封面          version:2025-00-22 15:16
	VideoGroupId int64           `gorm:"column:video_group_id" json:"VideoGroupId"` //type:int64        comment:视频分组id    version:2025-00-22 15:16
	Category     []*Category     `gorm:"-" json:"Category"`
	VideoGroup   VideoGroup      `gorm:"-" json:"VideoGroup"`
	VideoClass   VideoClass      `gorm:"-" json:"VideoClass"`
	VideoUrl     VideoUrl        `gorm:"-" json:"VideoUrl"`
	VideoList    []Video         `gorm:"-" json:"VideoList"`
	Type         *int            `gorm:"column:type" json:"Type"`         // type:*int              comment:类型 1 电影 2 电视剧    version:2025-05-06 06:51
	Keywords     string          `gorm:"column:keywords" json:"Keywords"` //type:string            comment:关键词 ,逗号隔开        version:2025-9-28 17:40
	TypePid      int64           `gorm:"column:type_pid" json:"TypePid"`  //type:int64             comment:                        version:2025-9-28 17:45
	TypeId       int64           `gorm:"column:type_id" json:"TypeId"`    //type:int64             comment:                        version:2025-9-28 17:45
	VideoUrlArr  []VideoUrl      `gorm:"foreignKey:VideoId;references:Id" json:"VideoUrlArr"`
	Browse       int             `gorm:"column:browse" json:"Browse"` // type:*int              comment:                        version:2025-10-04 21:43
}

// TableName 表名:video，。
func (*Video) TableName() string {
	return "video"
}

func (that *Video) Create(tx *gorm.DB) (err error) {
	if tx == nil {
		tx = core.New().DB.DB.DB
	}
	if that.Title == "" {
		return
	}
	var oldVideo Video
	tx.Where("title = ?", that.Title).
		Where("type_pid = ?", that.TypePid).
		First(&oldVideo)
	if oldVideo.Id > 0 {
		tx.Where("id = ?", oldVideo.Id).Updates(that)
		that.Id = oldVideo.Id
	} else {
		err = tx.Create(that).Error
	}
	return
}

func (that *Video) List(page int, pageSize int, id int64, keyWord string, categoryId string, typeId int64) (data []Video, total int64, err error) {
	// 1. 构建基础查询条件
	queryBuilder := core.New().DB.Model(&Video{})

	// 关键词过滤：根据中文/短词决定使用全文检索或 LIKE
	useSearch := false
	if keyWord != "" {
		kw := strings.TrimSpace(keyWord)
		if kw != "" {
			useSearch = true
			if containsHan(kw) || isShortAsciiQuery(kw) {
				// 中文或过短英文：使用 LIKE 回退，兼容短词与未启用 ngram 分词的 MySQL
				like := "%" + kw + "%"
				queryBuilder = queryBuilder.Where("(title LIKE ? OR alias LIKE ? OR keywords LIKE ?)", like, like, like)
			} else {
				// 英文/拼音等较规范的检索：使用 BOOLEAN MODE（仅 title 有 FULLTEXT）+ 短语 LIKE 兜底
				bq := buildBooleanQuery(kw)
				like := "%" + kw + "%"
				queryBuilder = queryBuilder.Where("(MATCH(title) AGAINST(? IN BOOLEAN MODE) OR title LIKE ? OR alias LIKE ? OR keywords LIKE ?)", bq, like, like, like)
			}
		}
	}

	if categoryId != "" {
		// ... (解析 ids 的代码和上面一样)
		clean := strings.Trim(strings.TrimSpace(categoryId), "\"'")
		var ids []string
		if strings.Contains(clean, ",") {
			parts := strings.Split(clean, ",")
			for _, p := range parts {
				p = strings.Trim(strings.TrimSpace(p), "\"'")
				if p != "" {
					ids = append(ids, p)
				}
			}
		} else if clean != "" {
			ids = append(ids, clean)
		}

		if len(ids) > 0 {
			subQuery := core.New().DB.Model(&VideoCategory{}).
				Select("video_id").
				Where("category_id IN ?", ids).
				Group("video_id").
				Having("COUNT(DISTINCT category_id) = ?", len(ids))

			queryBuilder = queryBuilder.Where("id IN (?)", subQuery)
		}

	}
	if typeId > 0 {
		queryBuilder = queryBuilder.Where("type_pid IN (?)", typeId)
	}
	// 2. 使用构建好的查询条件执行 Count
	err = queryBuilder.Count(&total).Error
	if err != nil {
		return
	}
	if total == 0 {
		return // 如果总数为0，没必要执行后续的Find查询
	}
	// 3. 排序（在 Count 之后再追加 Select/Order，避免干扰 Count）
	if categoryId != "" || (useSearch && keyWord != "") {
		kw := strings.TrimSpace(keyWord)
		if kw == "" {
			queryBuilder = queryBuilder.Order("browse DESC, id DESC")
		} else if containsHan(kw) || isShortAsciiQuery(kw) {
			// LIKE 分支：构造一个简易的相关性得分
			like := "%" + kw + "%"
			scoreCase := "(CASE WHEN title = ? THEN 200 WHEN title LIKE ? THEN 80 WHEN alias LIKE ? THEN 60 WHEN keywords LIKE ? THEN 30 ELSE 0 END) AS score"
			queryBuilder = queryBuilder.Select("video.*, "+scoreCase, kw, like, like, like).
				Order("score DESC, browse DESC, id DESC")
		} else {
			// BOOLEAN MODE 分支：多字段加权 + 精确匹配强力加权
			bq := buildBooleanQuery(kw)
			like := "%" + kw + "%"
			scoreExpr := "((MATCH(title) AGAINST(? IN BOOLEAN MODE))*3 + (CASE WHEN title = ? THEN 200 ELSE 0 END) + (CASE WHEN title LIKE ? THEN 80 WHEN alias LIKE ? THEN 60 WHEN keywords LIKE ? THEN 30 ELSE 0 END)) AS score"
			queryBuilder = queryBuilder.Select("video.*, "+scoreExpr, bq, kw, like, like, like).
				Order("score DESC, browse DESC, id DESC")
		}
	} else {
		queryBuilder = queryBuilder.Order("id DESC")
	}
	// 3. 在同样的查询条件下，添加分页和排序，执行 Find
	err = queryBuilder.Where("id > ?", id).
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&data).Error

	return
}

func (that *Video) Get(id int64) (data Video, err error) {
	err = core.New().DB.Where("id = ?", id).
		Preload("VideoUrlArr").First(&data).Error
	return
}

func (that *Video) Del(id int64) (err error) {
	err = core.New().DB.Where("id = ?", id).Delete(&Video{}).Error
	return
}

func (that *Video) ListByVideoGroupId(videoGroupId int64) (data []Video) {
	core.New().DB.Model(that).Where("video_group_id = ?", &videoGroupId).Find(&data)
	return
}

// containsHan 判断是否包含中文（CJK）
func containsHan(s string) bool {
	for _, r := range s {
		if unicode.Is(unicode.Han, r) {
			return true
		}
	}
	return false
}

// isShortAsciiQuery 判断是否为过短的 ASCII 关键词（MySQL 全文检索对短词不友好）
func isShortAsciiQuery(s string) bool {
	s = strings.TrimSpace(s)
	if s == "" {
		return true
	}
	// 仅包含 ASCII 字符且整体长度较短（<3）或全部 token 太短
	if !regexp.MustCompile(`^[\x00-\x7F]+$`).MatchString(s) {
		return false
	}
	tokens := strings.Fields(s)
	short := true
	for _, t := range tokens {
		if len(t) >= 3 {
			short = false
			break
		}
	}
	return short
}

// buildBooleanQuery 将原始关键词转换为 BOOLEAN MODE 形式，如 +term*
func buildBooleanQuery(s string) string {
	s = strings.TrimSpace(s)
	// 去除可能影响布尔检索的特殊符号，仅保留常见字母数字与空格
	cleaned := regexp.MustCompile(`[^\p{L}\p{N}\s]+`).ReplaceAllString(s, " ")
	parts := strings.Fields(cleaned)
	var out []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		// 过滤常见英文停用词，避免 +the* +and* 等影响检索
		if isEnglishStopword(p) {
			continue
		}
		// 对英文等前缀匹配友好的语言，加上 + 前缀和 * 尾缀
		if regexp.MustCompile(`^[A-Za-z0-9._-]+$`).MatchString(p) {
			if len(p) >= 3 {
				out = append(out, "+"+p+"*")
			} else {
				// 太短的 token 略过，避免影响检索质量
				continue
			}
		} else {
			// 对其它（如带重音符/多语言），仍然尝试 +token*
			out = append(out, "+"+p+"*")
		}
	}
	if len(out) == 0 {
		return s
	}
	return strings.Join(out, " ")
}

// isEnglishStopword 判断是否为英文停用词
func isEnglishStopword(s string) bool {
	w := strings.ToLower(strings.TrimSpace(s))
	switch w {
	case "a", "an", "the", "and", "or", "but", "if", "then", "else",
		"of", "to", "in", "on", "for", "with", "by", "at", "from", "as",
		"is", "are", "was", "were", "be", "been", "being",
		"this", "that", "these", "those", "it", "its", "into", "over", "under",
		"about", "between", "through", "during", "before", "after":
		return true
	default:
		return false
	}
}
