# Project Documentation & Architecture Manual

This document details the system design, algorithmic mechanics, and database schemas of the **Metro Route Finder** project. It includes flowcharts, Data Flow Diagrams (DFDs), UML Class diagrams, and Entity-Relationship (ER) schemas rendered using Mermaid.js.

---

## 1. System Flowchart (Route Calculation Flow)

```mermaid
graph TD
    A["User Inputs (Start, End, Mode, Peak Hour)"] --> B["React Frontend (App.jsx)"]
    B --> C["HTTP POST Request (/api/route)"]
    C --> D["Express API Server (server.js)"]
    D --> E["Spawn child process: MetroRouteFinder.exe --route"]
    E --> F["C++ Query Engine (main.cpp)"]
    F --> G["FileManager::resolveDatasetPath()"]
    G --> H["Load stations.json & connections.json"]
    H --> I["Graph Constructor & Valdiation"]
    I --> J["RouteFinder Traversal Loops (Dijkstra/BFS/A*/Yen's)"]
    J --> K["Build RouteResult (Distance, Time, Telemetry Stats)"]
    K --> L["Serialize RouteResult to JSON stdout & exit"]
    L --> D
    D --> M["Calculate Fares (₹10 base + ₹5/km) & Peak 20% surcharge"]
    D --> N["Generate Offline Vector QR Code SVG (deterministic hash)"]
    D --> O["Save search query to history.json (persistent disk write)"]
    D --> P["HTTP Response Payload"]
    P --> B
    B --> Q["Render Leaflet Map path animations & Digital Ticket Board"]
```

---

## 2. Data Flow Diagram (DFD Level 1)

```mermaid
graph LR
    User(["Passenger"])
    Admin(["Administrator"])
    
    P1["1.0 Path Optimization & Traversal"]
    P2["2.0 Fare Billing & QR Issuance"]
    P3["3.0 Network Mutation Dashboard"]
    P4["4.0 Graph Analytics Diagnostics"]
    
    DS1[("stations.json")]
    DS2[("connections.json")]
    DS3[("history.json")]
    
    User -->|Selects Route Params| P1
    P1 -->|Triggers C++ Executable| DS1
    P1 -->|Triggers C++ Executable| DS2
    P1 -->|Returns Route & Stats| P2
    P2 -->|Stores Travel log| DS3
    P2 -->|Outputs Boarding Ticket| User
    
    Admin -->|Alters Nodes & Tracks| P3
    P3 -->|Writes Station Edits| DS1
    P3 -->|Writes Connection Edits| DS2
    
    Admin -->|Requests Network Telemetry| P4
    P4 -->|Fetches Analytics Matrix| DS1
    P4 -->|Fetches Analytics Matrix| DS2
    P4 -->|Returns Densities & Components| Admin
```

---

## 3. UML Class Diagram (C++ Backend Architecture)

```mermaid
classDiagram
    class Station {
        +string id
        +string name
        +string line
        +double x
        +double y
        +bool interchange
    }

    class Edge {
        +string to
        +double distance
        +double time
        +double fare
        +string line
    }

    class AlgorithmStats {
        +string algorithmName
        +double executionTimeMs
        +int nodesVisited
        +size_t memoryUsageBytes
    }

    class RouteResult {
        +vector~string~ route
        +double distance
        +double time
        +double fare
        +int stations
        +int interchanges
        +AlgorithmStats stats
    }

    class GraphStats {
        +int totalStations
        +int totalConnections
        +int totalLines
        +int connectedComponents
        +double averageDegree
        +double graphDensity
        +string longestRouteFrom
        +string longestRouteTo
        +double longestRouteDistance
        +string shortestRouteFrom
        +string shortestRouteTo
        +double shortestRouteDistance
        +string mostConnectedStationId
        +int mostConnectedStationDegree
    }

    class Graph {
        -unordered_map~string, Station~ stations
        -unordered_map~string, vector~Edge~~ adjacencyList
        +addStation(Station s) void
        +addConnection(string from, string to, double dist, double time, double fare, string line) void
        +getStations() unordered_map~string, Station~
        +getAdjacencyList() unordered_map~string, vector~Edge~~
    }

    class RouteFinder {
        -Graph graph
        -runDijkstra(string start, string end, int weightMode) RouteResult
        -getHeuristic(string node, string target, int weightMode) double
        -buildResult(vector~string~ path, AlgorithmStats stats) RouteResult
        +getGraphStats() GraphStats
        +findShortestRoute(string start, string end) RouteResult
        +findRouteBFS(string start, string end) RouteResult
        +findRouteDFS(string start, string end) RouteResult
        +findRouteAStar(string start, string end, int weightMode) RouteResult
        +findRouteBidirectionalBFS(string start, string end) RouteResult
        +findRouteBidirectionalDijkstra(string start, string end, int weightMode) RouteResult
        +findRouteFloydWarshall(string start, string end) RouteResult
        +findKShortestRoutes(string start, string end, int K, int weightMode) vector~RouteResult~
        +findRankedRoutes(string start, string end) vector~RouteResult~
    }

    class FileManager {
        +loadGraph(string stationsFile, string connectionsFile) Graph
        +loadSampleGraph() Graph
        +resolveDatasetPath(string relativePath) string
    }

    Graph o-- Station
    Graph o-- Edge
    RouteFinder --> Graph
    RouteFinder ..> RouteResult
    RouteFinder ..> GraphStats
    RouteResult o-- AlgorithmStats
    FileManager ..> Graph
```

---

## 4. Entity-Relationship (ER) Diagram (Database Models)

```mermaid
erDiagram
    STATION {
        string id PK
        string name
        string line
        double x
        double y
        boolean interchange
    }

    CONNECTION {
        string from FK
        string to FK
        double distance
        double time
        double fare
        string line
    }

    HISTORY {
        string id PK
        string start
        string end
        string mode
        string route
        double fare
        double distance
        double time
        timestamp timestamp
    }

    STATION ||--o{ CONNECTION : "originates"
    STATION ||--o{ CONNECTION : "terminates"
```
