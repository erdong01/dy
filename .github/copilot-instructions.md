# Copilot Instructions for this repo (dy)
Purpose: arm coding agents with the minimum they need to ship changes fast while matching existing patterns. Always cite workspace-relative paths.

## Backend Layout
- Root Go module (`video`) exposes a Gin REST API on `:9191`; Next.js app sits in `dy_react/` and calls `/api/v1/...`.
- `main.go` loads `etc/config.yaml` (Viper), initializes MySQL via `pkg/db.NewDBS().InitGorm`, stores handles on `core.New()`, applies CORS (`middlewares/cors.go`), then mounts routers from `router/router.go` at `/api`.
- Keep global state in the singleton (`core/core.go`); do not create ad‑hoc DB/config/redis clients inside handlers.
- Kafka consumer entrypoint: `cmd/kafka/main.go` (same config load path) bootstraps `pkg/kafka.ConsumerInit` (Sarama consumer group).

## Request Lifecycle
- `/api/v1/video` → `controller/videoController.go`
	- GET `/list` expects PascalCase query keys: `Page`, `PageSize`, `Id`, `KeyWord`, `CategoryId`. Response shape: `{ Data, LastId, Total }`.
		- Keyword: Chinese/short ASCII uses `LIKE`; longer ASCII uses `MATCH(title) AGAINST ... IN BOOLEAN MODE` with `LIKE` fallback; sorts by computed relevance, then `browse DESC, id DESC`.
		- Category filter: intersection via `video_category` subquery with `GROUP BY video_id` + `HAVING COUNT(DISTINCT category_id)=N`.
	- GET `/get` returns `{ Data, Category }`; also increments `browse` asynchronously via `gorm.Expr("browse + 1")`.
	- POST `/create`: `c.BindJSON(&model.Video)` (PascalCase JSON). Ensures categories via `model.Category.Create`, upserts `VideoGroup`, `Video.Create()` (dedupe by `title` + `type_id` → update-in-place or insert), creates `VideoUrl`, then diffs and syncs `video_category` inside a transaction.
	- POST `/update`: placeholder.
- `/api/v1/category/list` → `controller/category/categoryController.go`: wraps `Category.HomeList()` to serve curated sections “类型/年代/地区” with `SonCategory` preloaded and ordered.

## Persistence Patterns
- Use GORM only via `core.New().DB` (singleton seeded by `pkg/db/dbs.go`); optional dbresolver/sharding helpers are scaffolded.
- `model.Video.Create` dedupes on exact `title` + `type_id`; on hit performs update-in-place and sets `video.Id`.
- `model.Video.List` composes all filters on one builder; call `Count` first, then apply `Select/Order/Offset/Limit/Find` so totals and results stay in sync.
- `model.Category.Create` ensures parent categories exist by name/type and expands comma-delimited children; returns IDs used to sync the `video_category` join.

## Background Work & Integrations
- Kafka: `cmd/kafka/main.go` creates a Sarama consumer group (SASL creds from `config.Kafka`), runs `Consume` loop, persists message payloads to `message_<unix>.json`, then `MarkMessage`.
- Add consumers by implementing `sarama.ConsumerGroupHandler` and passing to `pkg/kafka.ConsumerInit`.
- Config contains live credentials (`etc/config.yaml`); prefer a local copy/overrides to avoid hitting production systems.

## Frontend Notes
- Next.js App Router under `dy_react/app/` calls the backend with PascalCase payloads.
- Base URL via `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:9191`); see `dy_react/app/ui/list/list.tsx` and `dy_react/app/details/page.tsx` for request/shape expectations.
- Coordinate any API shape changes with UI—list page reads `{ Data, Total }`; details page reads `{ Data, Category }` and expects `VideoUrlArr`.

## Local Development
- Backend: `go build -o ./release main.go && ./release` (listens on `:9191`, exposes `/ping`). Docker: `docker build -t app .` then `docker run -dp 9090:9191 --name dy -v ./etc:/app/etc -v ./release:/app --restart unless-stopped app`.
- Kafka worker: `go run cmd/kafka/main.go` (ensure `config.Kafka` brokers/creds are reachable).
- Tests: under `test/` some cases hit external services; run selectively to avoid network flakiness.
- Frontend: `cd dy_react && npm install && npm run dev` (serves on `:3000`). API contract is `/api/v1/...` with PascalCase fields.

## Conventions & References
- PascalCase JSON keys on models drive request/response schemas; controllers use `c.BindJSON` with those tags.
- Controllers keep `defer` recover blocks; e.g., `List` standardizes `{ Data: [], LastId: 0, Total: 0 }` on panic.
- Use shared helpers: routing (`router/router.go`), DB bootstrap (`pkg/db/*.go`), config (`config/*.go`), logging (`core/zap.go`, `pkg/zapService/zap.go`).
- Examples to mirror: list flow (`controller/videoController.go` + `model/video.go`), curated categories (`controller/category/categoryController.go`).

Flag anything unclear or outdated so we can tighten this guide.
