# Performance Analysis

## Backend Route Engine

- Dijkstra shortest route: $O((V + E) \log V)$
- BFS fewest-stops route: $O(V + E)$
- Connectivity check: $O(V + E)$

## Frontend

- Station search filter: $O(n)$ per keystroke on the small demo dataset
- Route card rendering: linear in route length

## Dataset

- The sample dataset is intentionally small for fast evaluation, but the design scales to larger metro networks with the same adjacency-list structure.