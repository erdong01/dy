<<<<<<< HEAD

# Copilot Instructions for dy (影视管理系统)

Compact, task-first hints for agents. Cite paths relative to repo root.

## Architecture Overview
- **Backend**: Go 1.21+ / Gin (`main.go` → `:9191`). Router: `router/router.go`. Shared state via `core/core.go` singleton (`core.New()`).
- **Frontend**: Next.js 14 App Router in `dy_react/`. API via `NEXT_PUBLIC_API_BASE_URL` to `/api/v1/...`.
- **Async Worker**: Kafka consumer (`cmd/kafka/main.go`) using IBM Sarama. Config in `cmd/kafka/etc/config.yaml`.
- **Config**: `etc/config.yaml` loaded by Viper → `config.ConfigGlobal`. Contains MySQL, Redis, Elastic, Kafka, RabbitMQ, Gorse, OSS configs.
=======
# Copilot Instructions for this repo (dy)
Compact, task-first hints for agents. Cite paths relative to repo root.

## Architecture Snapshot
- **Backend**: Go 1.25 + Gin (`main.go`). Router in `router/router.go`. Shared state via `core/core.go` singleton (`core.New()`).
- **Frontend**: Next.js App Router in `dy_react/`. API calls via `NEXT_PUBLIC_API_BASE_URL` to `/api/v1/...`.
- **Async/Data**: Kafka consumer (`cmd/kafka/main.go`) uses Sarama. Configs for Redis, MySQL, Elastic, Gorse, RabbitMQ, OSS in `config/`.
- **Config**: `etc/config.yaml` loaded by Viper into `config.ConfigGlobal`.
>>>>>>> 3ecf609bc18fc91db6f0269bfaee5d5ca313352a

## Backend Patterns

### Core Singleton
Access DB, Redis, Config via `core.New()`. **Never** create new clients in handlers.
```go
core.New().DB.Model(&Video{}).Where(...)  // ✅
db, _ := gorm.Open(...)  // ❌ Don't do this
```

### Controller-Model Separation
- **Controllers** (`controller/`): Parse requests with `c.BindJSON()` / `c.Query()`, call model methods, return JSON.
- **Models** (`model/`): Business logic + DB operations. All models use GORM soft-delete (`gorm.DeletedAt`).

<<<<<<< HEAD
### Idempotency / Upsert Patterns
- `Video.Create`: Upsert by `(title, type_id)` – updates existing, creates if new.
- `VideoUrl.Create`: Upsert by `(video_id, proxy_name)`.
- `Category.Create`: Parses comma/slash-separated names, upserts each, returns `categoryIds`.

### Hybrid Search (`model/video.go`)
```
Chinese/short query → LIKE on title, alias, keywords
English/long query  → MATCH...AGAINST (Boolean Mode) + LIKE fallback
```
Scoring: `exact_match (200) > title_like (80) > alias_like (60) > keywords_like (30) + browse_count`.
Category filtering: Intersection via `VideoCategory` subquery with `GROUP BY + HAVING COUNT = len(ids)`.

### API Endpoints (router/router.go)
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/v1/video/list` | `controller.List` | Paginated list with search/filter |
| GET | `/api/v1/video/get?Id=` | `controller.Get` | Single video + VideoUrlArr + Categories |
| POST | `/api/v1/video/create` | `controller.Create` | Upsert video with categories/urls |
| GET | `/api/v1/category/list` | `category.List` | Category tree for filters |

## Frontend Patterns (`dy_react/`)

### Routing & State
- Home: `app/page.tsx` → `app/ui/list/list.tsx` (video grid)
- Details: `app/details/page.tsx` → `components/DetailsClient.tsx` (player)
- State in URL params: `?page=1&keyword=xxx&category=1,2&TypeId=3`. Use `useRouter().push()` to mutate.

### Video Player (`components/DetailsClient.tsx`)
- Stack: Vidstack + Hls.js + p2p-media-loader (WebRTC P2P acceleration)
- Source prioritization: "豆瓣资源" sources first, then others
- Playback state persisted to `localStorage` key: `video:play:{videoId}`
- Auto-recovery: Downgrades quality on stall, recovers to max after 30s stable

### Key Components
| Component | Purpose |
|-----------|---------|
| `app/ui/list/list.tsx` | Video grid with search, category filter, pagination |
| `components/CategoryMenu.tsx` | Multi-level category filter UI |
| `app/ui/menu/menus.tsx` | Navbar with TypeId selector |
| `app/lib/LanguageContext.tsx` | i18n context provider |

## Developer Workflows

### Run Locally
```bash
# Backend (port 9191)
go run main.go

# Frontend (port 3000)
cd dy_react && npm install && npm run dev

# Kafka consumer (optional)
cd cmd/kafka && go run main.go
```

### Build & Deploy
```bash
# Backend binary
go build -o ./release main.go

# Docker (mounts etc/ and binary)
docker build -t app .
docker run -dp 9090:9191 --name dy -v ./etc:/app/etc -v ./release:/app --restart unless-stopped app
```

### Testing
```bash
go test ./test/...           # Unit tests
cd dy_react && npm run lint  # Frontend lint
```

## Key File Reference
| Area | Files |
|------|-------|
| Entry | `main.go`, `dy_react/app/layout.tsx` |
| Routing | `router/router.go`, `dy_react/app/**/page.tsx` |
| Data Models | `model/video.go`, `model/category.go`, `model/videoUrl.go` |
| DB Setup | `pkg/db/dbs.go`, `pkg/db/db.go` |
| Config | `etc/config.yaml`, `config/global.go` |
| Player | `dy_react/components/DetailsClient.tsx` |
| Types | `dy_react/app/lib/types.ts` |

## Conventions
- JSON field names: PascalCase (e.g., `VideoUrlArr`, `CreatedAt`) to match Go struct tags
- Timestamps: GORM auto-managed `CreatedAt`, `UpdatedAt`, `DeletedAt`
- Error handling: Controllers use `defer recover()` to catch panics, return empty arrays on error
- Category types: `1 = Movie`, `2 = TVSeries` (see `model/category.go` constants)
=======
## Key Paths
- **Handlers**: `controller/videoController.go` (List/Get/Create logic).
- **Data Layer**: `model/video.go` (Search/CRUD), `pkg/db/dbs.go` (GORM setup).
- **Config**: `etc/config.yaml`, `config/global.go`.
- **Frontend UI**: `dy_react/app/ui/list/list.tsx` (Video Grid), `dy_react/components/CategoryMenu.tsx`.

## Requirements
- **Go**: 1.25+ (参见 [go.mod](http://_vscodecontentref_/1))
- **Node.js**: 20+ (Next.js 15 要求)
- **Next.js**: 15.x, React 19.x, TypeScript 5.x
- **Docker Runtime**: `ubuntu:24.04` 基础镜像
>>>>>>> 3ecf609bc18fc91db6f0269bfaee5d5ca313352a
