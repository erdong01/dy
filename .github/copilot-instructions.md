
# Copilot Instructions for this repo (dy)
A compact guide for AI coding agents to be productive quickly. Cite workspace paths (relative to repo root) when referencing files.

## 快速概览（大图）
- 后端：Go + Gin，入口 `main.go`，路由在 `router/router.go`，依赖注入与全局句柄放在 `core/core.go`。
- 前端：Next.js (App Router) 位于 `dy_react/`，通过 `NEXT_PUBLIC_API_BASE_URL` 调用后端 `/api/v1/...`。
- 异步：Kafka consumer 在 `cmd/kafka/main.go`（使用 pkg/kafka 和 Sarama），示例消息保存在 `cmd/kafka/message_*.json`。

## 关键约定（必须遵守）
- 不要在 handler/控制器中创建新的 DB/Redis 客户端：始终使用 `core.New().DB`（见 `pkg/db/dbs.go` 与 `core/core.go`）。
- JSON/Query 字段使用 PascalCase（例如 `Page`, `PageSize`, `KeyWord`）。控制器使用 `c.BindJSON`/`c.BindQuery` 直接映射到模型。
- 列表查询先 `Count` 再 `Select/Order/Offset/Limit/Find` 以保证 Total 与结果一致（参见 `model.Video.List`）。
- 去重/上次行为：`model.Video.Create` 以 `title + type_id` 做唯一判定，命中时 update-in-place 并设置 `video.Id`。

## 常见控制器行为示例
- `/api/v1/video/list` (see `controller/videoController.go`):
	- Keyword：短中文/短 ASCII 用 `LIKE`，长 ASCII 优先 `MATCH ... IN BOOLEAN MODE` 并回退到 `LIKE`。
	- 类目过滤：通过 `video_category` 子查询，`GROUP BY video_id HAVING COUNT(DISTINCT category_id)=N` 做交集过滤。
- `/api/v1/video/get`：返回 `{ Data, Category }`，并异步用 `gorm.Expr("browse + 1")` 增加 `browse`。

## 运行 / 调试 / 测试（最常用命令）
- 后端快速运行（本地开发）：
	- 构建并运行：
		go build -o ./release main.go && ./release
	- 或直接运行：
		go run main.go
- Kafka worker：
		go run cmd/kafka/main.go
- 运行测试（注意部分测试会依赖外部服务）：
		go test ./...  # 或选择性运行 test 下子目录
- 前端（在 `dy_react/`）：
		cd dy_react && npm install && npm run dev

## 集成点与外部依赖
- 配置：`etc/config.yaml`（Viper）；生产/本地凭据会通过该文件，开发时请使用本地 overrides 避免触发生产服务。
- MySQL（GORM）、Redis、Kafka、OSS 等，相关初始化在 `pkg/` 和 `config/` 下（例：`config/mysql.go`, `config/kafka.go`, `pkg/redis`）。

## 小贴士（常见坑/约束）
- 修改 DB 模型/迁移时请检查 `model/*.go` 的 Create/List 约定（去重、事务、video_category 同步）。
- 前后端字段名严格依赖 PascalCase；改动 API 字段必须同时调整 `dy_react/` 的调用文件（示例：`dy_react/app/ui/list/list.tsx`）。
- 新增后台消费者：实现 `sarama.ConsumerGroupHandler` 并在 `pkg/kafka.ConsumerInit` 中注册。

## 重要文件速查
- `main.go` — 应用入口
- `router/router.go` — 路由装载
- `core/core.go` — 全局单例（DB、Logger）
- `controller/` — HTTP 控制器
- `model/` — 数据层（Video/Category/VideoUrl/VideoGroup 等）
- `pkg/db/dbs.go` — GORM 初始化
- `cmd/kafka/main.go` — Kafka consumer entry
- `dy_react/` — Next.js 前端

如果需要把某个控制器或模型的实现细节展开为示例（例如 `video` 创建流程或 `video_category` 同步事务），告诉我目标文件，我会把关键代码片段与注意点补进来。

---
请审阅这个精简版并告诉我是否要合并原来更详细的段落（我们目前保留了主要约定与运行步骤）。
