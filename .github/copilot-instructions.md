# Copilot Instructions for this repo (dy)

Purpose: make AI agents immediately productive in this monorepo. Keep responses concrete, reference files by path, and follow the existing patterns.

## Big picture
- This repo hosts a Go backend (module name `video`) and a Next.js app under `dy_react/`.
- Backend stack: Gin HTTP server, GORM (MySQL), Viper for config, optional Kafka consumer. Central state lives in `core.Core` (DB, Redis placeholders, global config).
- Primary API surface:
  - Router mounted in `router/router.go`
  - Versioned under `/api/v1/...` in `main.go` via `router.RouterGroupApp.ApiRouter.InitApiRouter(r.Group("/api"))`
  - Video endpoints in `controller/videoController.go`; Category endpoints in `controller/category/categoryController.go`.
- Data model in `model/`: `Video`, `Category`, `VideoGroup`, `VideoCategory`.
- Config is loaded from `etc/config.yaml` into `config.ConfigGlobal`; only `Mysql` and `Kafka` are actively used.

## How the server starts
- Entry: `main.go`.
  - Loads `etc/config.yaml` with Viper into `config.ConfigGlobal`.
  - Initializes GORM using `pkg/db` and stores it into `core.New().DB`.
  - Sets up Gin + CORS and mounts `/api/v1/video` and `/api/v1/category` routes.
  - Exposes `/ping` and listens on `:9090`.

Example local run (macOS zsh):
- Build binary into `./release`:
  - go build -o ./release main.go
- Start server:
  - ./release
- Or Docker (see `README.md`):
  - docker build -t app .
  - docker run -it -dp 9090:9090 --name dy -v ./etc:/app/etc -v ./release:/app --restart unless-stopped app

## Key conventions & patterns
- Core singleton: use `core.New()` to access shared dependencies: `core.New().DB`, `core.New().ConfigGlobal`.
- DB access pattern (GORM): query via `core.New().DB` from model methods. See `model.Video.List`, `model.Video.Create`.
- Fulltext search: uses MySQL MATCH AGAINST in `model.Video.Create/List`.
- Category creation pattern: `model.Category.Create` ensures parent/child categories exist; returns all relevant `categoryIds` for association.
- Video-group upsert: `model.VideoGroup.Edit` finds or creates a group by `Title` and sets default `IsHide`.
- Controller responses: use Gin JSON with PascalCase keys matching struct JSON tags (e.g., `"Data"`, `"Total"`).
- Transaction pattern: see `controller.Create` for syncing `video_category` mapping (calculate toCreate/toDelete; use `tx := db.Begin()` and commit/rollback).
- Routing: all routes are grouped under `/api/v1`; extend via `router.ApiRouter.InitApiRouter`.

## Add a new API endpoint (example)
- Add handler in an appropriate controller file (use Gin context and JSON tags consistent with existing code).
- Register route inside `router/router.go` under the correct version/group.
- Use models for DB work; prefer methods on model types and access DB via `core.New().DB`.
- Return JSON keys in PascalCase to align with the frontend/tests.

## Kafka consumer workflow
- Separate entrypoint: `cmd/kafka/main.go`.
  - Loads `etc/config.yaml`, assigns to `core.New().ConfigGlobal`.
  - Initializes a Sarama consumer group using `pkg/kafka.ConsumerInit` and `config.Kafka`.
  - `Consumer.ConsumeClaim` logs messages and writes each to `message_<unix>.json` in the working dir, then marks.
- Run locally:
  - go run ./cmd/kafka

## Files/directories to know
- main server: `main.go`, `router/router.go`, `controller/`, `model/`, `pkg/db/`, `middlewares/cors.go`, `etc/config.yaml`.
- DB config/types: `config/*.go` and `pkg/db/*.go`.
- Logging: `pkg/zapService/zap.go` provides rotating file logger, though `core/zap.go` is currently a stub.
- Frontend (Next.js): `dy_react/` (dev with `npm run dev` inside that folder).

## Testing and examples
- Example ingestion test `test/cj/cj_test.go` shows transforming external video metadata into this API's `POST /api/v1/video/create` payload.
- Basic tests `test/kafka_test.go` are placeholders.

## Common pitfalls & gotchas
- Ensure `etc/config.yaml` exists and contains a valid `Mysql` DSN; server will panic on missing config.
- `core.New().DB` is set in `main.go` after successful `InitGorm`—do not use before initialization.
- JSON field naming is PascalCase across the API; match tags carefully.
- `model.Video.Create` dedupes by exact title and MATCH AGAINST; repeated creates will update the existing row and propagate `Id`.
- When updating many-to-many (`video_category`), follow the compute-and-sync pattern as in `controller.Create`.

## Frontend quickstart (dy_react)
- cd dy_react && npm install && npm run dev
- The backend API base is typically `/api/v1/...` on :9090.

## When adding deps or changing build
- Respect `module video` in `go.mod` (imports use `video/...`).
- Keep init flow: viper -> core.ConfigGlobal -> db.InitGorm -> core.DB -> router.

If anything above is unclear or missing (e.g., Redis usage, logging setup, or deployment specifics), ask for details and I’ll refine this file.
