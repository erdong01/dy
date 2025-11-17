
# Copilot Instructions for this repo (dy)
Compact, task-first hints for agents. Cite paths relative to repo root.

## Architecture Snapshot
- Backend: Go + Gin entry `main.go`; router wiring in `router/router.go`; shared handles live in `core/core.go` and are populated from `etc/config.yaml` on startup.
- Frontend: Next.js App Router in `dy_react/`; all API calls go through `NEXT_PUBLIC_API_BASE_URL` against `/api/v1/...` endpoints (see `dy_react/app/ui/list/list.tsx`).
- Async: Kafka consumer bootstrap in `cmd/kafka/main.go` uses Sarama via `pkg/kafka/kafka.go`; sample payloads live under `cmd/kafka/message_*.json` for replay.

## Backend Conventions
- Always reuse dependencies from `core.New()` (DB, config, redis); never instantiate GORM/redis clients inside handlers.
- Request payloads mirror model structs with PascalCase fields (`Page`, `KeyWord`, `CategoryId`); controllers call `c.BindJSON`/`c.BindQuery` directly.
- `model/video.go` enforces idempotent creates: `Video.Create` upserts by `title + type_id`, `VideoUrl.Create` updates by `(video_id, proxy_name)`, and `VideoGroup.Edit` reuses titles.
- When expanding category metadata call `model.Category.Create`; it splits multilingual delimiters and bumps `VideoCount` counters (see `model/category.go`).

## Query & API Patterns
- `controller/videoController.go` derives pagination/query defaults defensively, then calls `Video.List`; keep the `Count -> Order -> Offset/Limit` sequence to preserve totals.
- `Video.List` mixes boolean full-text search with LIKE fallbacks, supports category intersection via `VideoCategory` subquery, and filters by `TypePid` when `TypeId` is provided—reuse its helpers for new listings.
- `video/get` preloads `VideoUrlArr` and returns paired categories while incrementing browse counts asynchronously with `gorm.Expr("browse + 1")`.

## Configuration & Integrations
- Global config structs are in `config/*.go`; `etc/config.yaml` must supply MySQL DSN fields plus optional Redis/Kafka credentials. Keep local overrides out of version control.
- GORM setup is centralized in `pkg/db/dbs.go`; register sharding/resolvers through `Dbs` helpers instead of direct `db.Use`.
- Kafka client expects SASL credentials from config and writes consumed payloads to timestamped JSON files—extend `cmd/kafka/main.go` if additional sinks are needed.

## Frontend Guideline
- Home page (`dy_react/app/page.tsx`) wraps the nav `Menus` and `List` in Suspense; pagination/search state is read from URL params, so mutations should always go through `useRouter().push`.
- `List` composes query strings with PascalCase keys to match backend expectations; keep new filters aligned or adjust controller bindings.
- Details view (`dy_react/app/details/page.tsx`) hydrates `DetailsClient`, which prioritizes `VideoUrlArr` entries named "豆瓣资源", parses playback variants via `app/lib/parseM3u8.ts`, and persists player state to `localStorage`.
- The player (`components/DetailsClient.tsx`) injects Vidstack + Hls.js + p2p-media-loader; when changing streaming behavior, review provider hooks like `onProviderChange` and the downgrade/upgrade logic.

## Everyday Workflows
- Backend run: `go run main.go`; build: `go build -o ./release main.go && ./release`.
- Tests: `go test ./...` (some suites expect DB/Kafka); run selectively under `test/` when possible.
- Kafka worker: `go run cmd/kafka/main.go` (Ctrl+C triggers graceful shutdown).
- Frontend: `cd dy_react && npm install && npm run dev`; production build via `npm run build && npm run start`.

## Handy Paths
- `controller/` HTTP handlers, `model/` data layer, `middlewares/cors.go` for shared middleware.
- `dy_react/app/ui/menu/menus.tsx` (TypeId filter UX), `dy_react/components/CategoryMenu.tsx` (CategoryId selector), `dy_react/components/DetailsClient.tsx` (player orchestration).
