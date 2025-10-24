# Copilot Instructions for this repo (dy)
Purpose: help coding agents ship changes fast—cite workspace-relative paths and align with existing patterns.

## Architecture Snapshot
- Monorepo: Go backend (`module video`) at repo root, Next.js client inside `dy_react/` (boot with `npm install && npm run dev`).
- Backend stack: Gin HTTP server, GORM (MySQL), Viper for config; Kafka consumer lives in `cmd/kafka/` and shares the same config load path.
- Core singleton (`core/core.go`) stores global config plus the `*db.Dbs` handle; always reach shared state via `core.New()`.
- Data layer in `model/`: `Video`, `Category`, `VideoGroup`, `VideoCategory`; controllers in `controller/` orchestrate requests and marshal PascalCase JSON.

## Runtime Flow
- `main.go` loads `etc/config.yaml` into `config.ConfigGlobal`, initializes MySQL via `pkg/db.NewDBS().InitGorm`, assigns `core.New().DB`, installs CORS (`middlewares/cors.go`), and mounts `/api/v1/...` routes via `router/router.go`; server listens on `:9090` and exposes `/ping`.
- APIs live under `/api/v1/video` (list/create/get/update) and `/api/v1/category` (list). Query parameters and payload fields are capitalized (`Page`, `CategoryId`, `Title`, etc.) to mirror JSON tags.
- Build & run locally: `go build -o ./release main.go` then `./release`; Docker recipe in `Dockerfile` matches README commands.
- Kafka worker (`cmd/kafka/main.go`) also loads config, then `pkg/kafka.ConsumerInit` wires Sarama with SASL against `config.Kafka` and writes each message body to `message_<unix>.json` before marking.

## Data & Persistence Patterns
- `model.Video.Create` deduplicates by title using `MATCH(title) AGAINST('"Title"' IN BOOLEAN MODE)`; repeats trigger an update that keeps the original `Id`.
- `model.Video.List` reuses one `queryBuilder` to apply keyword fulltext search, category intersection (via `video_category` subquery), and pagination (`Offset`/`Limit`); pass `Id` to resume listings.
- Category ingestion (`model.Category.Create`) ensures parent rows exist, splits comma-delimited children, and returns every associated `category_id`; controller `Create` syncs the many-to-many join inside an explicit transaction.
- `model.VideoGroup.Edit` upserts groups by `Title`, defaulting `IsHide` to `2` when absent; link the resulting `VideoGroupId` before persisting the video.

## Conventions to Keep
- Always access GORM through `core.New().DB`; do not instantiate new connections in handlers.
- JSON keys must remain PascalCase to stay compatible with existing frontend/tests; reuse the struct tags defined in `model/` types.
- When modifying associations, follow the compute-and-sync pattern in `controller/videoController.go` (gather existing rows, diff, create missing, delete extras within a transaction).
- Keep configuration-driven behavior in sync with `etc/config.yaml`; a missing MySQL DSN or Kafka credential will crash startup.

## Useful References
- Router & middleware wiring: `router/router.go`, `middlewares/cors.go`.
- DB/bootstrap helpers: `pkg/db/*.go`, `config/mysql.go`, `config/kafka.go`.
- Example ingestion + API payload: `test/cj/cj_test.go` demonstrates transforming third-party metadata and POSTing to `/api/v1/video/create`.
- Frontend consumes the same API base (`/api/v1/...`); coordinate schema changes with `dy_react/` components if you adjust contracts.

Flag anything unclear or outdated and we can refine this guide.
