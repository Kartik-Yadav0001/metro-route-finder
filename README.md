# Metro Route Finder

A **production-ready, enterprise-grade** metro navigation system combining a high-performance **C++17 Graph Optimization engine**, a secure **Node.js Express REST API**, and a modern **React.js SPA Dashboard** with interactive maps, bilingual controls, JWT-secured admin panel, and real-time congestion telemetry.

---

## 🏗️ Technical Architecture & Core Features

### C++ DSA Engine (Backend)
| Algorithm | Purpose |
|-----------|---------|
| **Dijkstra** | Multi-weighted shortest distance, fastest time, cheapest fare |
| **BFS** | Fewest stops (hop count minimization) |
| **DFS** | Structural reachability and graph traversal |
| **A\* Search** | Heuristic-guided fast pathfinding using station coordinates |
| **Bidirectional Dijkstra/BFS** | Meeting-in-the-middle bidirectional traversals |
| **Floyd-Warshall** | Pre-computed all-pairs shortest paths matrix |
| **Yen's K-Shortest Paths** | Loopless K-alternative route generation |

### Node.js Express API (Middleware)
- **JWT Authentication** — Zero-dependency HMAC-SHA256 tokens guard all admin mutations
- **Atomic File Writes** — `tmp → rename` pattern prevents database corruption on failure
- **Schema Validation** — Strict field-type enforcement on all POST/PUT mutation bodies
- **Request Size Limits** — 10 KB JSON/URLencoded body caps preventing payload DoS
- **In-Memory Rate Limiter** — 120 req/min per IP sliding window
- **Database Backups** — JSON snapshot backup/restore with timestamped versions

### React SPA Frontend
- **Passenger Dashboard** — Journey stats, CO₂ telemetry, weekly activity bar chart
- **Weather & Congestion Widget** — Live transit conditions + per-line congestion badges
- **Smart Search** — Fuzzy Levenshtein matching, voice dictation, favorites, recent history
- **Interactive Leaflet Map** — `L.CRS.Simple` flat map with pulsing train animation, tooltips, click-to-route
- **Algorithm Benchmark Visualizer** — Comparative execution time, memory, nodes-visited charts
- **Graph Analytics** — Kruskal's MST tree, cycle/loop detection, network density metrics
- **Admin Panel** — JWT-secured login gate, full station/connection CRUD, backup console
- **Bilingual UI** — English/Hindi full translation via dictionary, language toggle in header
- **Digital Boarding Pass** — Printable thermal-style ticket with generated QR SVG code

---

## 📁 Project Structure

```
metro-route-finder/
├── .github/
│   ├── ISSUE_TEMPLATE/          # Bug report & feature request templates
│   ├── CODEOWNERS               # Ownership assignments
│   ├── pull_request_template.md # Standardized PR checklist
│   └── workflows/ci.yml         # CI: frontend build + C++ tests + API tests
├── api/
│   └── server.js                # Express REST API (JWT, rate limiting, atomic writes)
├── backend/
│   ├── src/                     # C++ source — Graph, RouteFinder, FileManager
│   ├── tests/                   # C++ unit tests (GTest)
│   └── CMakeLists.txt           # CMake build configuration
├── database/
│   ├── stations.json            # Station node data
│   ├── connections.json         # Connection edge data
│   ├── history.json             # Persistent journey logs
│   └── backups/                 # Timestamped JSON database snapshots
├── docs/                        # Mermaid diagrams, UML, DFDs, architecture docs
├── frontend/
│   └── src/
│       ├── App.jsx              # Main SPA with all pages
│       ├── components/          # MetroMap, ErrorBoundary, MetricCard, InputField
│       ├── data/                # Static fallback metro data
│       ├── lib/                 # fuzzyMatch utility
│       └── styles/index.css     # Global CSS + keyframe animations
├── tests/
│   └── api_tests.js             # HTTP integration test suite (30+ assertions, 9 suites)
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE                      # MIT
└── README.md
```

---

## 🚀 Getting Started

### 1. Build the C++ Backend (MinGW/GCC on Windows)

```bash
cd backend
cmake -G "MinGW Makefiles" -B build_mingw -S .
cmake --build build_mingw

# Run C++ unit tests
.\build_mingw\RouteFinderTests.exe
.\build_mingw\AdminCrudTests.exe
.\build_mingw\PersistenceTests.exe
```

#### Direct CLI queries
```bash
.\build_mingw\MetroRouteFinder.exe --stats
.\build_mingw\MetroRouteFinder.exe --route A G ranked
.\build_mingw\MetroRouteFinder.exe --compare A G
```

### 2. Run the Express API Server

```bash
cd api
npm install
npm run start        # listens on http://localhost:3001
```

### 3. Run the React Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

### 4. Run API Integration Tests

With the Express server running in another terminal:
```bash
node tests/api_tests.js
```

---

## 🔐 Admin Authentication

The Admin Panel requires a JWT Bearer token. Default mock credentials:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

```bash
# Obtain token
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use token in subsequent admin requests
curl -X POST http://localhost:3001/api/admin/backup \
  -H "Authorization: Bearer <token>"
```

Tokens expire after **2 hours**. The frontend stores them in `localStorage` and attaches the header automatically.

---

## 📡 REST API Endpoint Registry

### Public Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health diagnostics |
| `GET` | `/api/stations` | All station nodes |
| `GET` | `/api/connections` | All connection edges |
| `GET` | `/api/graph` | Merged graph (stations + connections) |
| `GET` | `/api/stats` | Graph analytics (density, diameter, degree) |
| `GET` | `/api/history` | Journey log list |
| `POST` | `/api/history` | Save a new journey entry |
| `DELETE` | `/api/history` | Reset journey history |
| `POST` | `/api/route` | Plan route — body: `{ start, end, mode, isPeakHour?, passengerType?, travelHour? }` |
| `POST` | `/api/compare` | Compare algorithm performance — body: `{ start, end }` |
| `GET` | `/api/weather` | Live transit conditions & per-line congestion |

### Admin Endpoints (🔒 Bearer Token Required)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/login` | Authenticate and obtain JWT token |
| `POST` | `/api/admin/stations` | Create station |
| `PUT` | `/api/admin/stations/:id` | Update station details |
| `DELETE` | `/api/admin/stations/:id` | Delete station and adjacent connections |
| `POST` | `/api/admin/connections` | Add track connection |
| `DELETE` | `/api/admin/connections` | Remove track connection |
| `POST` | `/api/admin/backup` | Create database snapshot |
| `GET` | `/api/admin/backups` | List available backup timestamps |
| `POST` | `/api/admin/restore/:timestamp` | Restore from a specific backup |

---

## 📊 Algorithm Complexity Reference

| Algorithm | Time Complexity | Space | Best For |
|-----------|----------------|-------|----------|
| Dijkstra | O((V + E) log V) | O(V) | Shortest weighted path |
| BFS | O(V + E) | O(V) | Fewest stops |
| DFS | O(V + E) | O(V) | Reachability |
| A\* | O(E log V) | O(V) | Fast heuristic search |
| Bidirectional BFS | O(b^(d/2)) | O(b^(d/2)) | Large sparse graphs |
| Floyd-Warshall | O(V³) | O(V²) | All-pairs precomputation |
| Yen's K-Shortest | O(KN(M + N log N)) | O(KN) | K alternative paths |

---

## 🧪 Testing Overview

| Suite | Coverage |
|-------|---------|
| C++ Unit Tests | Graph validation, CRUD, file persistence |
| API Integration | 30+ assertions across 9 test suites |
| JWT Auth Tests | Login, invalid credentials, missing token |
| Schema Tests | Missing fields, type mismatches |
| Security Tests | 413 oversized payload, 404 unknown endpoints |

---

## 📄 Documentation

Full system diagrams, flowcharts, UML, and ERD models are in [`docs/`](docs/).

- [Architecture Overview](docs/Architecture.md)
- [API Documentation & Flow](docs/DOCUMENTATION.md)
- [Algorithm Explanation](docs/Algorithm-Explanation.md)
- [Performance Analysis](docs/Performance-Analysis.md)
- [Submission Checklist](docs/Submission-Checklist.md)

---

## License

MIT License — see [LICENSE](LICENSE) for details.
