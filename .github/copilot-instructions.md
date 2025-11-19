
# Copilot Instructions for this repo (dy)
Compact, task-first hints for agents. Cite paths relative to repo root.

## Architecture Snapshot
- **Backend**: Go + Gin (`main.go`). Router in `router/router.go`. Shared state via `core/core.go` singleton (`core.New()`).
- **Frontend**: Next.js App Router in `dy_react/`. API calls via `NEXT_PUBLIC_API_BASE_URL` to `/api/v1/...`.
- **Async/Data**: Kafka consumer (`cmd/kafka/main.go`) uses Sarama. Configs for Redis, MySQL, Elastic, Gorse, RabbitMQ, OSS in `config/`.
- **Config**: `etc/config.yaml` loaded by Viper into `config.ConfigGlobal`.

## Backend Patterns
- **Core Singleton**: Access DB, Redis, Config via `core.New()`. Do not create new clients in handlers.
- **Controllers**: `controller/` parses requests (`BindJSON`, `BindQuery`) and calls `model` methods.
- **Models**: `model/` contains business logic.
    - **Idempotency**: `Video.Create` upserts by `title + type_id`. `VideoUrl.Create` updates by `(video_id, proxy_name)`.
    - **Relations**: `Video.Create` manages `VideoCategory` and `VideoUrl` associations manually within transactions.
- **Search Logic** (`model/video.go`):
    - **Hybrid Search**: Uses `LIKE` for Chinese/short queries, `MATCH...AGAINST` (Boolean Mode) for others.
    - **Scoring**: Custom SQL scoring based on exact match, field weights (Title > Alias > Keywords), and browse count.
    - **Filtering**: Category intersection via `VideoCategory` subquery.

## Frontend Guidelines (`dy_react/`)
- **Routing**: `app/page.tsx` (Home), `app/details/page.tsx` (Video Details).
- **State**: Search/Pagination state in URL params. Use `useRouter().push` to mutate.
- **Player**: `components/DetailsClient.tsx` integrates Vidstack, Hls.js, and p2p-media-loader.
    - Prioritizes "豆瓣资源" in `VideoUrlArr`.
    - Persists state to `localStorage`.
- **WebTorrent**: `app/ui/webtor/webtor.tsx` handles magnet links via `window.webtor`.

## Critical Workflows
- **Backend Run**: `go run main.go` (starts HTTP server).
- **Kafka Worker**: `go run cmd/kafka/main.go` (consumes topics, writes payloads to `message_*.json`).
- **Frontend Dev**: `cd dy_react && npm run dev`.
- **Build**: `go build -o ./release main.go`. `docker build -t app .`.

## Key Paths
- **Handlers**: `controller/videoController.go` (List/Get/Create logic).
- **Data Layer**: `model/video.go` (Search/CRUD), `pkg/db/dbs.go` (GORM setup).
- **Config**: `etc/config.yaml`, `config/global.go`.
- **Frontend UI**: `dy_react/app/ui/list/list.tsx` (Video Grid), `dy_react/components/CategoryMenu.tsx`.
