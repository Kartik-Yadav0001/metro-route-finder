# Algorithm Explanation

## Core Ideas

- Stations are modeled as graph vertices.
- Metro tracks are weighted undirected edges.
- Route selection is driven by Dijkstra for shortest, fastest, and cheapest queries.
- BFS is used for fewest-stops traversal.
- DFS validates connectivity across the entire network.

## Graph

Stations are vertices and tracks are weighted undirected edges stored as an adjacency list.

- Time complexity: $O(V + E)$ to build
- Space complexity: $O(V + E)$ for the adjacency list

## BFS

Used for minimum-stops route discovery.

- Time complexity: $O(V + E)$
- Space complexity: $O(V)$
- Dry run: start station enqueues its neighbors, then the next level of stations, until the destination is found.

## DFS

Used for network connectivity validation.

- Time complexity: $O(V + E)$
- Space complexity: $O(V)$
- Dry run: start from one station and recursively mark all reachable stations; if any remain unvisited, the graph is disconnected.

## Dijkstra

Used for shortest distance, fastest time, and cheapest fare.

- Time complexity: $O((V + E) \log V)$ with a min heap
- Space complexity: $O(V + E)$
- Dry run: initialize the source with zero cost, extract the cheapest frontier station, relax outgoing edges, and backtrack from the target.

## Floyd Warshall

Optional all-pairs shortest path extension.

- Time complexity: $O(V^3)$
- Space complexity: $O(V^2)$
- Dry run: compare every pair of stations via each intermediate station and keep the lower-cost result.

## Priority Queue

Used as the min-heap for Dijkstra.

- Insert: $O(\log V)$
- Extract: $O(\log V)$
- Dry run: the least-cost station is popped first, so the algorithm stays greedy and optimal.

## Hash Map

Used for station lookup.

- Average time: $O(1)$
- Space complexity: $O(V)$
- Dry run: station code C maps directly to the Central station object.

## Queue

Used in BFS.

- Enqueue/dequeue: $O(1)$
- Space complexity: $O(V)$
- Dry run: stations are processed level by level.

## Stack

Used for route reconstruction and backtracking.

- Push/pop: $O(1)$
- Space complexity: $O(V)$
- Dry run: walk backward from destination to source, then reverse the collected sequence.

## Greedy Algorithms

Used implicitly by Dijkstra when selecting the minimum tentative distance.

- Time complexity: depends on the underlying selection structure
- Dry run: always choose the cheapest available frontier state.

## Sorting Algorithms

Used for ranking alternative routes and ordering search results.

- Time complexity: typically $O(n \log n)$
- Dry run: sort candidate routes by distance or fare before showing alternatives.

## Searching Algorithms

Used for autocomplete and station lookup.

- Linear search: $O(n)$
- Binary search: $O(\log n)$ after sorting
- Dry run: scan station names as the user types the query.
