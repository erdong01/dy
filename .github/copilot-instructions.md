# Copilot Instructions for dy (影视管理系统)

Compact, task-first hints for agents. Cite paths relative to repo root.

## Architecture Overview
- **Backend**: Go (Gin framework). Entry: `main.go` → `:9191`.
- **Frontend**: Next.js 15 App Router in `dy_react/`. API via `NEXT_PUBLIC_API_BASE_URL` to `/api/v1/...`.
- **Async Worker**: Kafka consumer (`cmd/kafka/main.go`) using IBM Sarama.
- **Data Stores**: MySQL (GORM), Redis, ElasticSearch. Configured in `etc/config.yaml`.

## Backend Patterns (Go)

### Core Singleton
Access global state (DB, Redis, Config) via `core.New()`. **Never** create new clients in handlers.
```go
// ✅ Correct
core.New().DB.Model(&Video{}).Where(...)
// ❌ Incorrect
db, _ := gorm.Open(...)
```

### Controller-Model Separation
- **Controllers** (`controller/`): Parse requests (`c.BindJSON`, `c.Query`), call model methods, return JSON.
- **Models** (`model/`): Encapsulate business logic and DB operations. Use `gorm.DeletedAt` for soft deletes.

### Search Logic (`model/video.go`)
- **Hybrid Search**:
  - Chinese/Short queries: `LIKE` on title, alias, keywords.
  - English/Long queries: `MATCH...AGAINST` (Boolean Mode) + `LIKE` fallback.
- **Scoring**: Exact match > Title LIKE > Alias LIKE > Keywords LIKE + Browse count.

### API Structure (`router/router.go`)
- Base path: `/api/v1`
- `POST /video/create`: Upsert video (idempotent by title+type_id).
- `GET /video/list`: Paginated search/filter.
- `GET /video/get`: Single video details + URLs + Categories.
- `GET /category/list`: Category tree.

## Frontend Patterns (`dy_react/`)

### Tech Stack
- **Framework**: Next.js 15 (App Router).
- **Styling**: Tailwind CSS.
- **Player**: Vidstack + Hls.js + p2p-media-loader (WebRTC P2P).

### State Management
- **URL-Driven**: Search, pagination, and filters are stored in URL params (`?page=1&keyword=xxx`).
- **Persistence**: Playback state saved in `localStorage` (`video:play:{videoId}`).

### Key Components
- `app/ui/list/list.tsx`: Main video grid with search/filter logic.
- `components/DetailsClient.tsx`: Video player with P2P and auto-recovery logic.
- `app/lib/types.ts`: TypeScript definitions matching backend structs.

## Conventions

### Data & Naming
- **JSON Fields**: **PascalCase** (e.g., `VideoUrlArr`, `CreatedAt`) to match Go struct tags.
- **Timestamps**: GORM managed `CreatedAt`, `UpdatedAt`, `DeletedAt`.
- **Category Types**: `1 = Movie`, `2 = TVSeries` (Constants in `model/category.go`).

### Error Handling
- Backend: Controllers use `defer recover()` to catch panics. Return empty arrays/objects on error instead of 500s where possible to keep UI resilient.

## Developer Workflows

### Run Locally
```bash
# Backend (Port 9191)
go run main.go

# Frontend (Port 3000)
cd dy_react && npm install && npm run dev

# Kafka Consumer (Optional)
cd cmd/kafka && go run main.go
```

### Build & Deploy
```bash
# Backend Binary
go build -o ./release main.go

# Docker
docker build -t app .
docker run -dp 9090:9191 --name dy -v ./etc:/app/etc -v ./release:/app --restart unless-stopped app
```

### Testing
```bash
go test ./test/...           # Backend Unit Tests
cd dy_react && npm run lint  # Frontend Linting
```
