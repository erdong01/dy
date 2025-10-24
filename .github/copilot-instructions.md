# Copilot Instructions for this repo (dy)
Purpose: arm coding agents with the minimum they need to ship changes fast while matching existing patterns. Always cite workspace-relative paths.

## Backend Layout
- Root Go module (`video`) exposes a Gin REST API; Next.js app sits in `dy_react/` and speaks to `/api/v1/...`.
- `main.go` loads `etc/config.yaml` via Viper, initializes MySQL through `pkg/db.NewDBS().InitGorm`, stores handles on `core.New()`, applies CORS (`middlewares/cors.go`), then mounts routers from `router/router.go` on `/api`.
- Keep global state in the singleton (`core/core.go`); never instantiate ad-hoc DB or config clients inside handlers.
- Kafka consumer entrypoint lives at `cmd/kafka/main.go` and reuses the same config load path before starting `pkg/kafka.ConsumerInit`.

## Request Lifecycle
- `/api/v1/video` routes map directly to functions in `controller/videoController.go`; expect PascalCase query keys (`Page`, `CategoryId`, `KeyWord`) and payload fields matching `model.Video` tags.
- `List` builds responses with `Data`, `LastId`, `Total`; keep that shape when adding endpoints to avoid frontend regressions.
- `Create` binds a `model.Video`, calls `Category.Create` to expand category trees, upserts `VideoGroup`, and syncs the `video_category` join inside a transaction—reuse this diff-and-sync pattern for association writes.
- `/api/v1/category/list` (`controller/category/categoryController.go`) wraps `Category.HomeList()` which preloads child rows and rewrites section names; stay consistent with this curated payload.

## Persistence Patterns
- Access GORM only through `core.New().DB`; `pkg/db/dbs.go` seeds a single shared `*gorm.DB` (with optional resolver/sharding helpers already stubbed).
- `model.Video.Create` dedupes on title using `MATCH(title) AGAINST` and performs an update-in-place when a hit is found; callers rely on `video.Id` being populated afterward.
- `model.Video.List` composes filters on a single builder (keyword fulltext, intersection via `VideoCategory` subquery, cursor+page). Preserve this chain when extending filters so `Count` and `Find` stay in sync.
- `model.Category.Create` ensures parent categories exist by name/type and expands comma-delimited children; expect it to return the IDs needed for join table syncs.

## Background Work & Integrations
- `cmd/kafka/main.go` registers a Sarama consumer group with SASL credentials from `config.Kafka`; each message is persisted to `message_<unix>.json` before `MarkMessage`. Add new consumers by implementing `sarama.ConsumerGroupHandler` and passing them into `pkg/kafka.ConsumerInit`.
- Configuration includes live credentials in `etc/config.yaml`; use overrides or a copy when testing to avoid hitting production systems.

## Frontend Notes
- Next.js client in `dy_react/app/` uses the App Router and expects the backend’s PascalCase schema (check `dy_react/lib/utils.ts` and components under `dy_react/components/`). Coordinate payload changes with UI components before altering response shapes.

## Local Development
- Backend: `go build -o ./release main.go && ./release` (listens on `:9090`, exposes `/ping`). Docker workflow in `Dockerfile` mirrors the README commands.
- Kafka worker: `go run cmd/kafka/main.go` (ensure `config.Kafka` brokers are reachable, otherwise Sarama exits).
- Tests under `test/` exercise external services (`test/cj/cj_test.go` hits caiji.dyttzyapi.com and posts to the API); run selectively to avoid network flakiness.
- Frontend: `cd dy_react && npm install && npm run dev` (serves on `:3000`). The API base is hard-coded to the `/api/v1` contract.

## Conventions & References
- Stick to PascalCase JSON keys defined on model structs; controllers expect `c.BindJSON` to respect those tags.
- Maintain defensive `defer` recover blocks in controllers—they standardize empty responses instead of leaking stack traces.
- Use shared helpers: routing (`router/router.go`), DB bootstrap (`pkg/db/*.go`), config structs (`config/*.go`), logging (`core/zap.go`, `pkg/zapService/zap.go`).
- For ingestion examples, review `test/cj/cj_test.go` for how external metadata is transformed before hitting `/api/v1/video/create`.

Flag anything unclear or outdated so we can tighten this guide.
