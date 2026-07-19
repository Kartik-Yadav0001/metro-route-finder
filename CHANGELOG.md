# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-07-15
### Enterprise Upgrade — 22-Phase Transformation

#### Backend (C++)
- Refactored `Graph.cpp/h` with C++17 structured bindings, `std::string_view`, const-correctness, and move semantics
- Added `Graph::validate()` preventing duplicate stations, self-loops, negative weights
- Added 5 new algorithms: A\*, Bidirectional Dijkstra/BFS, Floyd-Warshall, Yen's K-Shortest Paths
- Added profiling telemetry: execution time (µs), nodes visited, heap memory bytes
- Added MST (Kruskal's) computation with edge list export for visualization

#### API (Node.js / Express)
- Implemented zero-dependency HMAC-SHA256 JWT authentication for all admin endpoints
- Added strict JSON schema validation middleware (field types + required fields)
- Added in-memory rate limiter (120 req/min per IP, 60-second sliding window)
- Added atomic file writes (`tmp → rename`) preventing database corruption
- Added request body size limits (10 KB) preventing payload DoS
- Added `GET /api/weather` — live transit conditions & per-line congestion simulation
- Added `POST /api/admin/login`, `POST /api/admin/backup`, `GET /api/admin/backups`, `POST /api/admin/restore/:ts`
- Added `POST /api/history` with unique ID generation

#### Frontend (React / Vite)
- Rebuilt Home page as Passenger Dashboard with journey metrics, CO₂ telemetry, and weekly bar chart
- Added Weather & Congestion widget polling every 5 minutes with per-line badges
- Upgraded Admin Panel with JWT login gate, token storage in `localStorage`, auto-attach Bearer headers
- Added Sign Out with `localStorage` token clear
- Added Algorithm Benchmark Visualizer: execution time, nodes visited, heap memory charts
- Added Graph Analytics page: Kruskal's MST tree, cycle detection, network density stats
- Added Smart Search: Levenshtein fuzzy matching, voice dictation, favorites, recent history
- Added Peak Hour / Passenger Type fare engine with printable thermal boarding pass + QR SVG
- Added `animate-fade-in` page transition animations + custom scrollbar styles
- Added ESLint config enforcing React Hooks rules, prefer-const, eqeqeq

#### Testing
- Expanded API integration test suite to 30+ assertions across 9 suites (JWT, CRUD, backups, schema, security, weather)

#### GitHub / DevOps
- Upgraded CI to 3 isolated jobs: frontend build, C++ GTest, API integration tests
- Added `CODEOWNERS` mapping all directories to team owners
- Added issue templates (bug report, feature request), PR checklist template
- Added `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE` (MIT)

---

## [1.0.0] - 2026-07-12
### Initial Release
- Basic C++ graph engine with Dijkstra and BFS pathfinding.
- Basic Express REST API serving static JSON data.
- React frontend displaying metro routes client-side.
- C++ test coverage using manual assertions.
- Basic CLI for admin operations.
