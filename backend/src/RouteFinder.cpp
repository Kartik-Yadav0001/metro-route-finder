#include "RouteFinder.h"
#include <algorithm>
#include <cmath>
#include <limits>
#include <queue>
#include <stack>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <chrono>
#include <iostream>
#include <functional>

namespace {
double selectWeight(const Edge& edge, int weightMode, bool simulateDelays) {
    if (weightMode == 1) {
        return edge.time + (simulateDelays ? edge.delayMin : 0.0);
    }
    if (weightMode == 2) return edge.fare;
    return edge.distance;
}

std::string getEdgeKey(const std::string& from, const std::string& to) {
    return from + "->" + to;
}
} // namespace

RouteFinder::RouteFinder(const Graph& graph) : graph(graph) {}

RouteResult RouteFinder::buildResult(const std::vector<std::string>& path, const AlgorithmStats& stats) const {
    RouteResult result;
    result.route = path;
    result.stats = stats;
    if (path.empty()) {
        return result;
    }
    result.stations = static_cast<int>(path.size());

    const auto& adjList = graph.getAdjacencyList();
    const auto& stationsMap = graph.getStations();

    for (std::size_t index = 0; index + 1 < path.size(); ++index) {
        const auto adjIt = adjList.find(path[index]);
        if (adjIt != adjList.end()) {
            const auto& adjacency = adjIt->second;
            const auto edge = std::find_if(adjacency.begin(), adjacency.end(), [&](const Edge& item) {
                return item.to == path[index + 1];
            });
            if (edge != adjacency.end()) {
                result.distance += edge->distance;
                result.time += edge->time;
                result.fare += edge->fare;
            }
        }
    }

    for (const auto& stationId : path) {
        const auto statIt = stationsMap.find(stationId);
        if (statIt != stationsMap.end() && statIt->second.interchange) {
            ++result.interchanges;
        }
    }
    return result;
}

double RouteFinder::getHeuristic(const std::string& node, const std::string& target, int weightMode) const {
    const auto& stations = graph.getStations();
    const auto nodeIt = stations.find(node);
    const auto targetIt = stations.find(target);
    if (nodeIt == stations.end() || targetIt == stations.end()) {
        return 0.0;
    }
    const double dx = nodeIt->second.x - targetIt->second.x;
    const double dy = nodeIt->second.y - targetIt->second.y;
    const double dist = std::sqrt(dx * dx + dy * dy);
    
    // Conservative scale (coordinates usually pixels).
    // Ensure heuristic is admissible: always underestimates.
    double scale = 0.005;
    if (weightMode == 1) return dist * scale * 1.0;
    if (weightMode == 2) return dist * scale * 1.5;
    return dist * scale;
}

RouteResult RouteFinder::runDijkstra(const std::string& start, const std::string& end, int weightMode) const {
    std::string modeStr = "Dijkstra_" + std::to_string(weightMode);
    RouteResult cachedRes;
    if (checkCache(start, end, modeStr, cachedRes)) {
        return cachedRes;
    }
    auto startTime = std::chrono::high_resolution_clock::now();
    int nodesVisited = 0;

    if (!graph.hasStation(start) || !graph.hasStation(end)) {
        return RouteResult{};
    }
    if (start == end) {
        std::vector<std::string> path = {start};
        auto endTime = std::chrono::high_resolution_clock::now();
        AlgorithmStats stats = {"Dijkstra", std::chrono::duration<double, std::milli>(endTime - startTime).count(), 1, sizeof(RouteResult)};
        return buildResult(path, stats);
    }

    using Node = std::pair<double, std::string>;
    std::priority_queue<Node, std::vector<Node>, std::greater<Node>> queue;
    std::unordered_map<std::string, double> distance;
    std::unordered_map<std::string, std::string> previous;

    for (const auto& pair : graph.getStations()) {
        distance[pair.first] = std::numeric_limits<double>::infinity();
    }

    distance[start] = 0.0;
    queue.push(std::make_pair(0.0, start));

    while (!queue.empty()) {
        const auto topPair = queue.top();
        const double currentDistance = topPair.first;
        const std::string currentNode = topPair.second;
        queue.pop();
        nodesVisited++;

        if (currentNode == end) {
            break;
        }

        if (currentDistance > distance[currentNode]) {
            continue;
        }

        const auto adjacencyIt = graph.getAdjacencyList().find(currentNode);
        if (adjacencyIt == graph.getAdjacencyList().end()) {
            continue;
        }
        
        for (const auto& edge : adjacencyIt->second) {
            if (wheelchairOnly_) {
                auto sIt = graph.getStations().find(edge.to);
                if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                    continue;
                }
            }
            const double candidate = currentDistance + selectWeight(edge, weightMode, simulateDelays_);
            if (candidate < distance[edge.to]) {
                distance[edge.to] = candidate;
                previous[edge.to] = currentNode;
                queue.push(std::make_pair(candidate, edge.to));
            }
        }
    }

    std::vector<std::string> path;
    if (distance.find(end) != distance.end() && std::isfinite(distance[end])) {
        for (std::string current = end; !current.empty();) {
            path.push_back(current);
            if (current == start) break;
            current = previous[current];
        }
        std::reverse(path.begin(), path.end());
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    std::size_t memoryEst = (distance.size() + previous.size()) * 48 + queue.size() * sizeof(Node);
    AlgorithmStats stats = {"Dijkstra", std::chrono::duration<double, std::milli>(endTime - startTime).count(), nodesVisited, memoryEst};
    RouteResult res = buildResult(path, stats);
    updateCache(start, end, modeStr, res);
    return res;
}

RouteResult RouteFinder::findShortestRoute(const std::string& start, const std::string& end) const {
    return runDijkstra(start, end, 0);
}

RouteResult RouteFinder::findFastestRoute(const std::string& start, const std::string& end) const {
    return runDijkstra(start, end, 1);
}

RouteResult RouteFinder::findCheapestRoute(const std::string& start, const std::string& end) const {
    return runDijkstra(start, end, 2);
}

std::vector<std::string> RouteFinder::findFewestStopsRoute(const std::string& start, const std::string& end) const {
    RouteResult res = findRouteBFS(start, end);
    return res.route;
}

RouteResult RouteFinder::findRouteBFS(const std::string& start, const std::string& end) const {
    RouteResult cachedRes;
    if (checkCache(start, end, "BFS", cachedRes)) {
        return cachedRes;
    }
    auto startTime = std::chrono::high_resolution_clock::now();
    int nodesVisited = 0;

    if (!graph.hasStation(start) || !graph.hasStation(end)) {
        return RouteResult{};
    }

    std::unordered_map<std::string, bool> visited;
    std::unordered_map<std::string, std::string> previous;
    std::queue<std::string> queue;

    visited[start] = true;
    queue.push(start);

    while (!queue.empty()) {
        const std::string current = queue.front();
        queue.pop();
        nodesVisited++;

        if (current == end) break;

        const auto adjacencyIt = graph.getAdjacencyList().find(current);
        if (adjacencyIt == graph.getAdjacencyList().end()) {
            continue;
        }

        for (const auto& edge : adjacencyIt->second) {
            if (wheelchairOnly_) {
                auto sIt = graph.getStations().find(edge.to);
                if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                    continue;
                }
            }
            if (!visited[edge.to]) {
                visited[edge.to] = true;
                previous[edge.to] = current;
                queue.push(edge.to);
            }
        }
    }

    std::vector<std::string> path;
    if (visited[end]) {
        for (std::string current = end; !current.empty();) {
            path.push_back(current);
            if (current == start) break;
            current = previous[current];
        }
        std::reverse(path.begin(), path.end());
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    std::size_t memoryEst = (visited.size() + previous.size()) * 32 + queue.size() * sizeof(std::string);
    AlgorithmStats stats = {"BFS", std::chrono::duration<double, std::milli>(endTime - startTime).count(), nodesVisited, memoryEst};
    RouteResult res = buildResult(path, stats);
    updateCache(start, end, "BFS", res);
    return res;
}

RouteResult RouteFinder::findRouteDFS(const std::string& start, const std::string& end) const {
    RouteResult cachedRes;
    if (checkCache(start, end, "DFS", cachedRes)) {
        return cachedRes;
    }
    auto startTime = std::chrono::high_resolution_clock::now();
    int nodesVisited = 0;

    if (!graph.hasStation(start) || !graph.hasStation(end)) {
        return RouteResult{};
    }

    std::unordered_map<std::string, bool> visited;
    std::unordered_map<std::string, std::string> previous;
    std::stack<std::string> stack;

    stack.push(start);

    while (!stack.empty()) {
        std::string current = stack.top();
        stack.pop();

        if (visited[current]) continue;
        visited[current] = true;
        nodesVisited++;

        if (current == end) break;

        const auto adjacencyIt = graph.getAdjacencyList().find(current);
        if (adjacencyIt == graph.getAdjacencyList().end()) {
            continue;
        }

        for (const auto& edge : adjacencyIt->second) {
            if (wheelchairOnly_) {
                auto sIt = graph.getStations().find(edge.to);
                if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                    continue;
                }
            }
            if (!visited[edge.to]) {
                previous[edge.to] = current;
                stack.push(edge.to);
            }
        }
    }

    std::vector<std::string> path;
    if (visited[end]) {
        for (std::string current = end; !current.empty();) {
            path.push_back(current);
            if (current == start) break;
            current = previous[current];
        }
        std::reverse(path.begin(), path.end());
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    std::size_t memoryEst = (visited.size() + previous.size()) * 32 + stack.size() * sizeof(std::string);
    AlgorithmStats stats = {"DFS", std::chrono::duration<double, std::milli>(endTime - startTime).count(), nodesVisited, memoryEst};
    RouteResult res = buildResult(path, stats);
    updateCache(start, end, "DFS", res);
    return res;
}

RouteResult RouteFinder::findRouteAStar(const std::string& start, const std::string& end, int weightMode) const {
    RouteResult cachedRes;
    if (checkCache(start, end, "AStar_" + std::to_string(weightMode), cachedRes)) {
        return cachedRes;
    }
    auto startTime = std::chrono::high_resolution_clock::now();
    int nodesVisited = 0;

    if (!graph.hasStation(start) || !graph.hasStation(end)) {
        return RouteResult{};
    }

    using Node = std::pair<double, std::string>;
    std::priority_queue<Node, std::vector<Node>, std::greater<Node>> openSet;
    std::unordered_map<std::string, double> gScore;
    std::unordered_map<std::string, std::string> previous;

    for (const auto& pair : graph.getStations()) {
        gScore[pair.first] = std::numeric_limits<double>::infinity();
    }

    gScore[start] = 0.0;
    openSet.push(std::make_pair(getHeuristic(start, end, weightMode), start));

    while (!openSet.empty()) {
        const auto currentPair = openSet.top();
        const std::string current = currentPair.second;
        openSet.pop();
        nodesVisited++;

        if (current == end) break;

        const auto adjacencyIt = graph.getAdjacencyList().find(current);
        if (adjacencyIt == graph.getAdjacencyList().end()) {
            continue;
        }

        for (const auto& edge : adjacencyIt->second) {
            if (wheelchairOnly_) {
                auto sIt = graph.getStations().find(edge.to);
                if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                    continue;
                }
            }
            const double tentative_gScore = gScore[current] + selectWeight(edge, weightMode, simulateDelays_);
            if (tentative_gScore < gScore[edge.to]) {
                previous[edge.to] = current;
                gScore[edge.to] = tentative_gScore;
                double fScore = tentative_gScore + getHeuristic(edge.to, end, weightMode);
                openSet.push(std::make_pair(fScore, edge.to));
            }
        }
    }

    std::vector<std::string> path;
    if (gScore[end] != std::numeric_limits<double>::infinity()) {
        for (std::string current = end; !current.empty();) {
            path.push_back(current);
            if (current == start) break;
            current = previous[current];
        }
        std::reverse(path.begin(), path.end());
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    std::size_t memoryEst = (gScore.size() + previous.size()) * 48 + openSet.size() * sizeof(Node);
    AlgorithmStats stats = {"A*", std::chrono::duration<double, std::milli>(endTime - startTime).count(), nodesVisited, memoryEst};
    RouteResult res = buildResult(path, stats);
    updateCache(start, end, "AStar_" + std::to_string(weightMode), res);
    return res;
}

RouteResult RouteFinder::findRouteBidirectionalBFS(const std::string& start, const std::string& end) const {
    RouteResult cachedRes;
    if (checkCache(start, end, "Bidirectional_BFS", cachedRes)) {
        return cachedRes;
    }
    auto startTime = std::chrono::high_resolution_clock::now();
    int nodesVisited = 0;

    if (!graph.hasStation(start) || !graph.hasStation(end)) {
        return RouteResult{};
    }
    if (start == end) {
        std::vector<std::string> path = {start};
        auto endTime = std::chrono::high_resolution_clock::now();
        return buildResult(path, {"Bidirectional BFS", 0.0, 1, sizeof(RouteResult)});
    }

    std::queue<std::string> q_forward, q_backward;
    std::unordered_map<std::string, std::string> parent_forward, parent_backward;
    std::unordered_set<std::string> visited_forward, visited_backward;

    q_forward.push(start);
    visited_forward.insert(start);
    q_backward.push(end);
    visited_backward.insert(end);

    std::string intersectNode = "";

    while (!q_forward.empty() && !q_backward.empty()) {
        // Forward BFS step
        std::string curr_forward = q_forward.front();
        q_forward.pop();
        nodesVisited++;

        if (visited_backward.find(curr_forward) != visited_backward.end()) {
            intersectNode = curr_forward;
            break;
        }

        const auto adjForward = graph.getAdjacencyList().find(curr_forward);
        if (adjForward != graph.getAdjacencyList().end()) {
            for (const auto& edge : adjForward->second) {
                if (wheelchairOnly_) {
                    auto sIt = graph.getStations().find(edge.to);
                    if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                        continue;
                    }
                }
                if (visited_forward.find(edge.to) == visited_forward.end()) {
                    visited_forward.insert(edge.to);
                    parent_forward[edge.to] = curr_forward;
                    q_forward.push(edge.to);
                }
            }
        }

        // Backward BFS step
        std::string curr_backward = q_backward.front();
        q_backward.pop();
        nodesVisited++;

        if (visited_forward.find(curr_backward) != visited_forward.end()) {
            intersectNode = curr_backward;
            break;
        }

        const auto adjBackward = graph.getAdjacencyList().find(curr_backward);
        if (adjBackward != graph.getAdjacencyList().end()) {
            for (const auto& edge : adjBackward->second) {
                if (wheelchairOnly_) {
                    auto sIt = graph.getStations().find(edge.to);
                    if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                        continue;
                    }
                }
                if (visited_backward.find(edge.to) == visited_backward.end()) {
                    visited_backward.insert(edge.to);
                    parent_backward[edge.to] = curr_backward;
                    q_backward.push(edge.to);
                }
            }
        }
    }

    std::vector<std::string> path;
    if (!intersectNode.empty()) {
        std::vector<std::string> forwardPath;
        for (std::string curr = intersectNode; curr != start; curr = parent_forward[curr]) {
            forwardPath.push_back(curr);
        }
        forwardPath.push_back(start);
        std::reverse(forwardPath.begin(), forwardPath.end());

        std::vector<std::string> backwardPath;
        for (std::string curr = parent_backward[intersectNode]; !curr.empty(); curr = parent_backward[curr]) {
            backwardPath.push_back(curr);
            if (curr == end) break;
        }

        path.insert(path.end(), forwardPath.begin(), forwardPath.end());
        path.insert(path.end(), backwardPath.begin(), backwardPath.end());
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    std::size_t memoryEst = (visited_forward.size() + visited_backward.size()) * 48 + (q_forward.size() + q_backward.size()) * sizeof(std::string);
    AlgorithmStats stats = {"Bidirectional BFS", std::chrono::duration<double, std::milli>(endTime - startTime).count(), nodesVisited, memoryEst};
    RouteResult res = buildResult(path, stats);
    updateCache(start, end, "Bidirectional_BFS", res);
    return res;
}

RouteResult RouteFinder::findRouteBidirectionalDijkstra(const std::string& start, const std::string& end, int weightMode) const {
    RouteResult cachedRes;
    if (checkCache(start, end, "Bidirectional_Dijkstra_" + std::to_string(weightMode), cachedRes)) {
        return cachedRes;
    }
    auto startTime = std::chrono::high_resolution_clock::now();
    int nodesVisited = 0;

    if (!graph.hasStation(start) || !graph.hasStation(end)) {
        return RouteResult{};
    }
    if (start == end) {
        std::vector<std::string> path = {start};
        auto endTime = std::chrono::high_resolution_clock::now();
        return buildResult(path, {"Bidirectional Dijkstra", 0.0, 1, sizeof(RouteResult)});
    }

    using Node = std::pair<double, std::string>;
    std::priority_queue<Node, std::vector<Node>, std::greater<Node>> pq_f, pq_b;
    std::unordered_map<std::string, double> dist_f, dist_b;
    std::unordered_map<std::string, std::string> parent_f, parent_b;
    std::unordered_set<std::string> visited_f, visited_b;

    for (const auto& pair : graph.getStations()) {
        dist_f[pair.first] = std::numeric_limits<double>::infinity();
        dist_b[pair.first] = std::numeric_limits<double>::infinity();
    }

    dist_f[start] = 0.0;
    pq_f.push(std::make_pair(0.0, start));
    dist_b[end] = 0.0;
    pq_b.push(std::make_pair(0.0, end));

    double bestCost = std::numeric_limits<double>::infinity();
    std::string intersectNode = "";

    while (!pq_f.empty() && !pq_b.empty()) {
        // Forward Step
        const auto topPairF = pq_f.top();
        const std::string curr_f = topPairF.second;
        pq_f.pop();
        nodesVisited++;
        visited_f.insert(curr_f);

        if (visited_b.find(curr_f) != visited_b.end()) {
            double cost = dist_f[curr_f] + dist_b[curr_f];
            if (cost < bestCost) {
                bestCost = cost;
                intersectNode = curr_f;
            }
        }

        const auto adjF = graph.getAdjacencyList().find(curr_f);
        if (adjF != graph.getAdjacencyList().end()) {
            for (const auto& edge : adjF->second) {
                if (wheelchairOnly_) {
                    auto sIt = graph.getStations().find(edge.to);
                    if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                        continue;
                    }
                }
                double candidate = dist_f[curr_f] + selectWeight(edge, weightMode, simulateDelays_);
                if (candidate < dist_f[edge.to]) {
                    dist_f[edge.to] = candidate;
                    parent_f[edge.to] = curr_f;
                    pq_f.push(std::make_pair(candidate, edge.to));
                }
            }
        }

        // Backward Step
        const auto topPairB = pq_b.top();
        const std::string curr_b = topPairB.second;
        pq_b.pop();
        nodesVisited++;
        visited_b.insert(curr_b);

        if (visited_f.find(curr_b) != visited_f.end()) {
            double cost = dist_f[curr_b] + dist_b[curr_b];
            if (cost < bestCost) {
                bestCost = cost;
                intersectNode = curr_b;
            }
        }

        const auto adjB = graph.getAdjacencyList().find(curr_b);
        if (adjB != graph.getAdjacencyList().end()) {
            for (const auto& edge : adjB->second) {
                if (wheelchairOnly_) {
                    auto sIt = graph.getStations().find(edge.to);
                    if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                        continue;
                    }
                }
                double candidate = dist_b[curr_b] + selectWeight(edge, weightMode, simulateDelays_);
                if (candidate < dist_b[edge.to]) {
                    dist_b[edge.to] = candidate;
                    parent_b[edge.to] = curr_b;
                    pq_b.push(std::make_pair(candidate, edge.to));
                }
            }
        }

        // Stop condition
        if (!pq_f.empty() && !pq_b.empty()) {
            if (pq_f.top().first + pq_b.top().first >= bestCost) {
                break;
            }
        }
    }

    std::vector<std::string> path;
    if (!intersectNode.empty() && std::isfinite(bestCost)) {
        std::vector<std::string> forwardPath;
        for (std::string curr = intersectNode; curr != start; curr = parent_f[curr]) {
            forwardPath.push_back(curr);
        }
        forwardPath.push_back(start);
        std::reverse(forwardPath.begin(), forwardPath.end());

        std::vector<std::string> backwardPath;
        for (std::string curr = parent_b[intersectNode]; !curr.empty(); curr = parent_b[curr]) {
            backwardPath.push_back(curr);
            if (curr == end) break;
        }

        path.insert(path.end(), forwardPath.begin(), forwardPath.end());
        path.insert(path.end(), backwardPath.begin(), backwardPath.end());
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    std::size_t memoryEst = (dist_f.size() + dist_b.size()) * 48 + (pq_f.size() + pq_b.size()) * sizeof(Node);
    AlgorithmStats stats = {"Bidirectional Dijkstra", std::chrono::duration<double, std::milli>(endTime - startTime).count(), nodesVisited, memoryEst};
    RouteResult res = buildResult(path, stats);
    updateCache(start, end, "Bidirectional_Dijkstra_" + std::to_string(weightMode), res);
    return res;
}

RouteResult RouteFinder::findRouteFloydWarshall(const std::string& start, const std::string& end) const {
    RouteResult cachedRes;
    if (checkCache(start, end, "Floyd_Warshall", cachedRes)) {
        return cachedRes;
    }
    auto startTime = std::chrono::high_resolution_clock::now();
    int nodesVisited = 0;

    const auto& stations = graph.getStations();
    const std::size_t stationCount = stations.size();
    std::vector<std::string> ids;
    ids.reserve(stationCount);

    for (const auto& pair : stations) {
        ids.push_back(pair.first);
    }

    std::vector<std::vector<double>> dist(stationCount, std::vector<double>(stationCount, std::numeric_limits<double>::infinity()));
    std::vector<std::vector<int>> next(stationCount, std::vector<int>(stationCount, -1));
    std::unordered_map<std::string, std::size_t> indexById;

    for (std::size_t i = 0; i < ids.size(); ++i) {
        indexById[ids[i]] = i;
        dist[i][i] = 0.0;
        next[i][i] = static_cast<int>(i);
    }

    for (const auto& pair : graph.getAdjacencyList()) {
        const auto fromIndex = indexById[pair.first];
        for (const auto& edge : pair.second) {
            const auto toIndex = indexById[edge.to];
            if (edge.distance < dist[fromIndex][toIndex]) {
                dist[fromIndex][toIndex] = edge.distance;
                next[fromIndex][toIndex] = static_cast<int>(toIndex);
            }
        }
    }

    for (std::size_t k = 0; k < stationCount; ++k) {
        nodesVisited++;
        for (std::size_t i = 0; i < stationCount; ++i) {
            for (std::size_t j = 0; j < stationCount; ++j) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];
                }
            }
        }
    }

    std::vector<std::string> path;
    if (graph.hasStation(start) && graph.hasStation(end)) {
        std::size_t u = indexById[start];
        std::size_t v = indexById[end];
        if (next[u][v] != -1) {
            path.push_back(start);
            while (u != v) {
                u = static_cast<std::size_t>(next[u][v]);
                path.push_back(ids[u]);
            }
        }
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    std::size_t memoryEst = stationCount * stationCount * (sizeof(double) + sizeof(int));
    AlgorithmStats stats = {"Floyd-Warshall", std::chrono::duration<double, std::milli>(endTime - startTime).count(), nodesVisited, memoryEst};
    RouteResult res = buildResult(path, stats);
    updateCache(start, end, "Floyd_Warshall", res);
    return res;
}

// Private virtual Dijkstra for Yen's algorithm (handles blocked elements)
namespace {
struct DijkstraYenResult {
    std::vector<std::string> path;
    double cost = std::numeric_limits<double>::infinity();
};
}

static DijkstraYenResult runDijkstraYen(
    const Graph& graph,
    const std::string& start,
    const std::string& end,
    int weightMode,
    const std::unordered_set<std::string>& blockedNodes,
    const std::unordered_set<std::string>& blockedEdges,
    bool wheelchairOnly,
    bool simulateDelays
) {
    if (!graph.hasStation(start) || !graph.hasStation(end)) {
        return DijkstraYenResult{};
    }
    if (blockedNodes.find(start) != blockedNodes.end() || blockedNodes.find(end) != blockedNodes.end()) {
        return DijkstraYenResult{};
    }
    if (start == end) {
        return DijkstraYenResult{{start}, 0.0};
    }

    using Node = std::pair<double, std::string>;
    std::priority_queue<Node, std::vector<Node>, std::greater<Node>> queue;
    std::unordered_map<std::string, double> distance;
    std::unordered_map<std::string, std::string> previous;

    for (const auto& pair : graph.getStations()) {
        distance[pair.first] = std::numeric_limits<double>::infinity();
    }

    distance[start] = 0.0;
    queue.push(std::make_pair(0.0, start));

    while (!queue.empty()) {
        const auto topPair = queue.top();
        const double currentDistance = topPair.first;
        const std::string currentNode = topPair.second;
        queue.pop();

        if (currentNode == end) {
            break;
        }

        if (currentDistance > distance[currentNode]) {
            continue;
        }

        const auto adjacencyIt = graph.getAdjacencyList().find(currentNode);
        if (adjacencyIt == graph.getAdjacencyList().end()) {
            continue;
        }

        for (const auto& edge : adjacencyIt->second) {
            if (blockedNodes.find(edge.to) != blockedNodes.end()) {
                continue;
            }
            std::string edgeKey = getEdgeKey(currentNode, edge.to);
            if (blockedEdges.find(edgeKey) != blockedEdges.end()) {
                continue;
            }
            if (wheelchairOnly) {
                auto sIt = graph.getStations().find(edge.to);
                if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                    continue;
                }
            }

            const double candidate = currentDistance + selectWeight(edge, weightMode, simulateDelays);
            if (candidate < distance[edge.to]) {
                distance[edge.to] = candidate;
                previous[edge.to] = currentNode;
                queue.push(std::make_pair(candidate, edge.to));
            }
        }
    }

    DijkstraYenResult result;
    if (distance.find(end) != distance.end() && std::isfinite(distance[end])) {
        result.cost = distance[end];
        for (std::string current = end; !current.empty();) {
            result.path.push_back(current);
            if (current == start) break;
            current = previous[current];
        }
        std::reverse(result.path.begin(), result.path.end());
    }
    return result;
}

std::vector<RouteResult> RouteFinder::findKShortestRoutes(const std::string& start, const std::string& end, int K, int weightMode) const {
    std::string modeStr = "K_Shortest_" + std::to_string(K) + "_" + std::to_string(weightMode);
    std::vector<RouteResult> cachedRes;
    if (checkVectorCache(start, end, modeStr, cachedRes)) {
        return cachedRes;
    }
    auto startTime = std::chrono::high_resolution_clock::now();
    int nodesVisited = 0;

    std::vector<RouteResult> kPaths;
    if (!graph.hasStation(start) || !graph.hasStation(end)) {
        return kPaths;
    }

    // A contains the K shortest paths
    std::vector<std::vector<std::string>> A;
    // B contains candidate paths
    std::vector<std::pair<double, std::vector<std::string>>> B;

    // Find the first shortest path
    DijkstraYenResult firstPath = runDijkstraYen(graph, start, end, weightMode, {}, {}, wheelchairOnly_, simulateDelays_);
    if (firstPath.path.empty()) {
        return kPaths;
    }

    A.push_back(firstPath.path);
    kPaths.push_back(buildResult(firstPath.path, {"Yen's K-Shortest", 0.0, 0, 0}));

    for (int k = 1; k < K; ++k) {
        for (std::size_t i = 0; i < A[k - 1].size() - 1; ++i) {
            std::string spurNode = A[k - 1][i];
            
            std::vector<std::string> rootPath;
            rootPath.insert(rootPath.end(), A[k - 1].begin(), A[k - 1].begin() + i + 1);

            std::unordered_set<std::string> blockedEdges;
            std::unordered_set<std::string> blockedNodes;

            for (const auto& path : A) {
                if (path.size() > i && std::equal(rootPath.begin(), rootPath.end(), path.begin())) {
                    blockedEdges.insert(getEdgeKey(path[i], path[i + 1]));
                    blockedEdges.insert(getEdgeKey(path[i + 1], path[i])); // Undirected graph edge block
                }
            }

            for (std::size_t nodeIdx = 0; nodeIdx < rootPath.size() - 1; ++nodeIdx) {
                blockedNodes.insert(rootPath[nodeIdx]);
            }

            DijkstraYenResult spurPath = runDijkstraYen(graph, spurNode, end, weightMode, blockedNodes, blockedEdges, wheelchairOnly_, simulateDelays_);
            nodesVisited++;

            if (!spurPath.path.empty()) {
                std::vector<std::string> totalPath = rootPath;
                // Avoid duplication of spurNode
                totalPath.pop_back(); 
                totalPath.insert(totalPath.end(), spurPath.path.begin(), spurPath.path.end());

                // Calculate cost
                double totalCost = 0.0;
                for (std::size_t step = 0; step + 1 < totalPath.size(); ++step) {
                    const auto& edges = graph.getAdjacencyList().at(totalPath[step]);
                    const auto it = std::find_if(edges.begin(), edges.end(), [&](const Edge& e) {
                        return e.to == totalPath[step + 1];
                    });
                    if (it != edges.end()) {
                        totalCost += selectWeight(*it, weightMode, simulateDelays_);
                    }
                }

                // Push to candidate pool B if not duplicate
                bool duplicate = false;
                for (const auto& pair : B) {
                    if (pair.second == totalPath) {
                        duplicate = true;
                        break;
                    }
                }
                if (!duplicate) {
                    B.push_back({totalCost, totalPath});
                }
            }
        }

        if (B.empty()) {
            break;
        }

        // Sort candidates
        std::sort(B.begin(), B.end(), [](const auto& a, const auto& b) {
            return a.first < b.first;
        });

        A.push_back(B[0].second);
        kPaths.push_back(buildResult(B[0].second, {"Yen's K-Shortest", 0.0, 0, 0}));
        B.erase(B.begin());
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    double timeMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();
    
    // Fill in stats for all generated paths
    for (auto& path : kPaths) {
        path.stats.executionTimeMs = timeMs;
        path.stats.nodesVisited = nodesVisited;
        path.stats.memoryUsageBytes = A.size() * sizeof(std::vector<std::string>) + B.size() * sizeof(std::pair<double, std::vector<std::string>>);
    }

    updateVectorCache(start, end, modeStr, kPaths);
    return kPaths;
}

std::vector<RouteResult> RouteFinder::findRankedRoutes(const std::string& start, const std::string& end) const {
    std::vector<RouteResult> cachedRes;
    if (checkVectorCache(start, end, "Ranked", cachedRes)) {
        return cachedRes;
    }
    // Generate up to 4 alternative routes based on different optimization metrics:
    // 1. Shortest path (by distance)
    // 2. Fastest path (by travel time)
    // 3. Cheapest path (by fare)
    // 4. BFS path (fewest stops)
    std::vector<RouteResult> candidates;
    
    RouteResult r1 = findShortestRoute(start, end);
    if (!r1.route.empty()) {
        r1.stats.algorithmName = "Optimized Shortest";
        candidates.push_back(r1);
    }

    RouteResult r2 = findFastestRoute(start, end);
    if (!r2.route.empty()) {
        r2.stats.algorithmName = "Optimized Fastest";
        candidates.push_back(r2);
    }

    RouteResult r3 = findCheapestRoute(start, end);
    if (!r3.route.empty()) {
        r3.stats.algorithmName = "Optimized Cheapest";
        candidates.push_back(r3);
    }

    RouteResult r4 = findRouteBFS(start, end);
    if (!r4.route.empty()) {
        r4.stats.algorithmName = "Optimized Fewest Stops";
        candidates.push_back(r4);
    }

    // Deduplicate candidates (by matching route vectors)
    std::vector<RouteResult> uniqueCandidates;
    for (const auto& item : candidates) {
        bool found = false;
        for (const auto& unique : uniqueCandidates) {
            if (unique.route == item.route) {
                found = true;
                break;
            }
        }
        if (!found) {
            uniqueCandidates.push_back(item);
        }
    }

    // Route Ranking Score:
    // Score = Distance * 0.4 + Time * 0.3 + Fare * 0.2 + Interchanges * 5.0
    // Sort in ascending order of score (lower score is better ranked)
    std::sort(uniqueCandidates.begin(), uniqueCandidates.end(), [](const RouteResult& a, const RouteResult& b) {
        double scoreA = a.distance * 0.4 + a.time * 0.3 + a.fare * 0.2 + a.interchanges * 5.0;
        double scoreB = b.distance * 0.4 + b.time * 0.3 + b.fare * 0.2 + b.interchanges * 5.0;
        return scoreA < scoreB;
    });

    updateVectorCache(start, end, "Ranked", uniqueCandidates);
    return uniqueCandidates;
}

std::vector<std::vector<double>> RouteFinder::floydWarshallDistances() const {
    const auto& stations = graph.getStations();
    const std::size_t stationCount = stations.size();
    std::vector<std::string> ids;
    ids.reserve(stationCount);

    for (const auto& pair : stations) {
        ids.push_back(pair.first);
    }

    std::vector<std::vector<double>> distances(stationCount, std::vector<double>(stationCount, std::numeric_limits<double>::infinity()));
    std::unordered_map<std::string, std::size_t> indexById;

    for (std::size_t index = 0; index < ids.size(); ++index) {
        indexById[ids[index]] = index;
        distances[index][index] = 0.0;
    }

    for (const auto& pair : graph.getAdjacencyList()) {
        const auto fromIndex = indexById[pair.first];
        for (const auto& edge : pair.second) {
            const auto toIndex = indexById[edge.to];
            distances[fromIndex][toIndex] = std::min(distances[fromIndex][toIndex], edge.distance);
        }
    }

    for (std::size_t via = 0; via < stationCount; ++via) {
        for (std::size_t from = 0; from < stationCount; ++from) {
            for (std::size_t to = 0; to < stationCount; ++to) {
                const double candidate = distances[from][via] + distances[via][to];
                if (candidate < distances[from][to]) {
                    distances[from][to] = candidate;
                }
            }
        }
    }

    return distances;
}

bool RouteFinder::isConnected() const {
    if (graph.getStations().empty()) return true;
    const auto start = graph.getStations().begin()->first;
    std::unordered_map<std::string, bool> visited;
    std::queue<std::string> queue;
    visited[start] = true;
    queue.push(start);

    while (!queue.empty()) {
        const std::string current = queue.front();
        queue.pop();
        
        const auto adjacencyIt = graph.getAdjacencyList().find(current);
        if (adjacencyIt == graph.getAdjacencyList().end()) {
            continue;
        }
        
        for (const auto& edge : adjacencyIt->second) {
            if (!visited[edge.to]) {
                visited[edge.to] = true;
                queue.push(edge.to);
            }
        }
    }

    return visited.size() == graph.getStations().size();
}

GraphStats RouteFinder::getGraphStats() const {
    GraphStats stats;
    const auto& stations = graph.getStations();
    const auto& adjList = graph.getAdjacencyList();

    stats.totalStations = static_cast<int>(stations.size());
    if (stats.totalStations == 0) {
        return stats;
    }

    // 1. Total Connections
    int edgeSum = 0;
    for (const auto& pair : adjList) {
        edgeSum += static_cast<int>(pair.second.size());
    }
    stats.totalConnections = edgeSum / 2;

    // 2. Total Lines
    std::unordered_set<std::string> lines;
    for (const auto& pair : stations) {
        if (!pair.second.line.empty()) {
            lines.insert(pair.second.line);
        }
    }
    for (const auto& pair : adjList) {
        for (const auto& edge : pair.second) {
            if (!edge.line.empty()) {
                lines.insert(edge.line);
            }
        }
    }
    stats.totalLines = static_cast<int>(lines.size());

    // 3. Connected Components (BFS from each unvisited node)
    std::unordered_map<std::string, bool> visited;
    int components = 0;
    for (const auto& pair : stations) {
        const std::string& startId = pair.first;
        if (!visited[startId]) {
            components++;
            std::queue<std::string> q;
            q.push(startId);
            visited[startId] = true;
            while (!q.empty()) {
                std::string curr = q.front();
                q.pop();
                const auto it = adjList.find(curr);
                if (it != adjList.end()) {
                    for (const auto& edge : it->second) {
                        if (!visited[edge.to]) {
                            visited[edge.to] = true;
                            q.push(edge.to);
                        }
                    }
                }
            }
        }
    }
    stats.connectedComponents = components;

    // 4. Average Degree and Density
    if (stats.totalStations > 0) {
        stats.averageDegree = static_cast<double>(edgeSum) / stats.totalStations;
    }
    if (stats.totalStations > 1) {
        stats.graphDensity = static_cast<double>(edgeSum) / (static_cast<double>(stats.totalStations) * (stats.totalStations - 1));
    }

    // 5. Longest Route (Diameter using Floyd-Warshall distances)
    std::vector<std::string> ids;
    ids.reserve(stats.totalStations);
    for (const auto& pair : stations) {
        ids.push_back(pair.first);
    }
    const auto distances = floydWarshallDistances();
    double maxDist = 0.0;
    std::size_t uLongest = 0, vLongest = 0;
    for (std::size_t i = 0; i < distances.size(); ++i) {
        for (std::size_t j = 0; j < distances[i].size(); ++j) {
            if (std::isfinite(distances[i][j]) && distances[i][j] > maxDist) {
                maxDist = distances[i][j];
                uLongest = i;
                vLongest = j;
            }
        }
    }
    if (maxDist > 0.0 && uLongest < ids.size() && vLongest < ids.size()) {
        stats.longestRouteFrom = ids[uLongest];
        stats.longestRouteTo = ids[vLongest];
        stats.longestRouteDistance = maxDist;
    }

    // 6. Shortest Route (smallest single connection distance)
    double minDist = std::numeric_limits<double>::infinity();
    std::string uShortest, vShortest;
    for (const auto& pair : adjList) {
        for (const auto& edge : pair.second) {
            if (edge.distance < minDist) {
                minDist = edge.distance;
                uShortest = pair.first;
                vShortest = edge.to;
            }
        }
    }
    if (minDist < std::numeric_limits<double>::infinity()) {
        stats.shortestRouteFrom = uShortest;
        stats.shortestRouteTo = vShortest;
        stats.shortestRouteDistance = minDist;
    }

    // 7. Most Connected Station
    int maxDegree = -1;
    std::string mostConnectedId;
    for (const auto& pair : adjList) {
        int deg = static_cast<int>(pair.second.size());
        if (deg > maxDegree) {
            maxDegree = deg;
            mostConnectedId = pair.first;
        }
    }
    stats.mostConnectedStationId = mostConnectedId;
    stats.mostConnectedStationDegree = maxDegree;

    return stats;
}

bool RouteFinder::checkCache(const std::string& start, const std::string& end, const std::string& mode, RouteResult& result) const {
    CompatLockGuard lock(cacheMutex);
    CacheKey key{start, end, mode};
    auto it = routeCache.find(key);
    if (it != routeCache.end()) {
        result = it->second;
        result.stats.algorithmName += " (Cached)";
        return true;
    }
    return false;
}

void RouteFinder::updateCache(const std::string& start, const std::string& end, const std::string& mode, const RouteResult& result) const {
    CompatLockGuard lock(cacheMutex);
    CacheKey key{start, end, mode};
    routeCache[key] = result;
}

bool RouteFinder::checkVectorCache(const std::string& start, const std::string& end, const std::string& mode, std::vector<RouteResult>& result) const {
    CompatLockGuard lock(vectorCacheMutex);
    CacheKey key{start, end, mode};
    auto it = vectorRouteCache.find(key);
    if (it != vectorRouteCache.end()) {
        result = it->second;
        for (auto& r : result) {
            r.stats.algorithmName += " (Cached)";
        }
        return true;
    }
    return false;
}

void RouteFinder::updateVectorCache(const std::string& start, const std::string& end, const std::string& mode, const std::vector<RouteResult>& result) const {
    CompatLockGuard lock(vectorCacheMutex);
    CacheKey key{start, end, mode};
    vectorRouteCache[key] = result;
}

namespace {
struct DSU {
    std::unordered_map<std::string, std::string> parent;
    void make_set(const std::string& v) {
        parent[v] = v;
    }
    std::string find_set(const std::string& v) {
        if (v == parent[v])
            return v;
        return parent[v] = find_set(parent[v]);
    }
    bool union_sets(const std::string& a, const std::string& b) {
        std::string root_a = find_set(a);
        std::string root_b = find_set(b);
        if (root_a != root_b) {
            parent[root_b] = root_a;
            return true;
        }
        return false;
    }
};
} // namespace

RouteFinder::MSTResult RouteFinder::findMSTKruskal() const {
    auto startTime = std::chrono::high_resolution_clock::now();
    MSTResult result;
    result.stats.algorithmName = "Kruskal MST";
    
    // 1. Gather all unique edges (undirected)
    struct RawEdge {
        std::string u;
        std::string v;
        double distance;
        std::string line;
    };
    std::vector<RawEdge> edges;
    for (const auto& pair : graph.getAdjacencyList()) {
        const std::string& u = pair.first;
        for (const auto& edge : pair.second) {
            if (u < edge.to) { // Only take each undirected edge once
                edges.push_back({u, edge.to, edge.distance, edge.line});
            }
        }
    }
    
    // 2. Sort by distance
    std::sort(edges.begin(), edges.end(), [](const RawEdge& a, const RawEdge& b) {
        return a.distance < b.distance;
    });
    
    // 3. Initialize DSU
    DSU dsu;
    for (const auto& stationPair : graph.getStations()) {
        dsu.make_set(stationPair.first);
    }
    
    // 4. Kruskal's loop
    double totalDist = 0.0;
    int visited = 0;
    for (const auto& edge : edges) {
        visited++;
        if (dsu.union_sets(edge.u, edge.v)) {
            result.edges.push_back({edge.u, edge.v, edge.distance, edge.line});
            totalDist += edge.distance;
        }
    }
    
    result.totalDistance = totalDist;
    
    auto endTime = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> duration = endTime - startTime;
    result.stats.executionTimeMs = duration.count();
    result.stats.nodesVisited = visited;
    result.stats.memoryUsageBytes = result.edges.size() * sizeof(MSTEdge) + edges.size() * sizeof(RawEdge);
    
    return result;
}

bool RouteFinder::detectCycle(std::vector<std::string>& cyclePath) const {
    std::unordered_map<std::string, bool> visited;
    std::unordered_map<std::string, std::string> parent;
    
    std::function<bool(const std::string&, const std::string&)> dfs = 
        [&](const std::string& u, const std::string& p) -> bool {
            visited[u] = true;
            parent[u] = p;
            
            auto it = graph.getAdjacencyList().find(u);
            if (it != graph.getAdjacencyList().end()) {
                for (const auto& edge : it->second) {
                    if (!visited[edge.to]) {
                        if (dfs(edge.to, u)) {
                            return true;
                        }
                    } else if (edge.to != p) {
                        // Cycle detected! Backtrack to form the cycle path
                        std::string curr = u;
                        cyclePath.push_back(edge.to);
                        while (curr != edge.to && !curr.empty()) {
                            cyclePath.push_back(curr);
                            curr = parent[curr];
                        }
                        cyclePath.push_back(edge.to);
                        std::reverse(cyclePath.begin(), cyclePath.end());
                        return true;
                    }
                }
            }
            return false;
        };
        
    for (const auto& stationPair : graph.getStations()) {
        if (!visited[stationPair.first]) {
            if (dfs(stationPair.first, "")) {
                return true;
            }
        }
    }
    return false;
}

std::vector<std::vector<std::string>> RouteFinder::getConnectedComponents() const {
    std::vector<std::vector<std::string>> components;
    std::unordered_map<std::string, bool> visited;
    
    for (const auto& stationPair : graph.getStations()) {
        const std::string& startNode = stationPair.first;
        if (!visited[startNode]) {
            std::vector<std::string> component;
            std::queue<std::string> queue;
            visited[startNode] = true;
            queue.push(startNode);
            
            while (!queue.empty()) {
                std::string current = queue.front();
                queue.pop();
                component.push_back(current);
                
                auto it = graph.getAdjacencyList().find(current);
                if (it != graph.getAdjacencyList().end()) {
                    for (const auto& edge : it->second) {
                        if (!visited[edge.to] && graph.hasStation(edge.to)) {
                            visited[edge.to] = true;
                            queue.push(edge.to);
                        }
                    }
                }
            }
            components.push_back(component);
        }
    }
    return components;
}

RouteResult RouteFinder::findFewestTransfersRoute(const std::string& start, const std::string& end) const {
    auto startTime = std::chrono::high_resolution_clock::now();
    RouteResult result;
    result.stats.algorithmName = "Fewest Transfers (Interchanges)";

    if (start == end) {
        result.route = {start};
        return result;
    }

    struct State {
        std::string station;
        std::string line;
        int transfers;
        int stops;
        double dist;
        double time;
        double fare;
        
        bool operator>(const State& other) const {
            if (transfers != other.transfers) {
                return transfers > other.transfers;
            }
            return stops > other.stops;
        }
    };

    std::priority_queue<State, std::vector<State>, std::greater<State>> pq;
    std::unordered_map<std::string, std::pair<int, int>> best;
    
    struct ParentInfo {
        std::string station;
        std::string line;
        double edgeDist;
        double edgeTime;
        double edgeFare;
    };
    std::unordered_map<std::string, ParentInfo> parent;

    auto it = graph.getAdjacencyList().find(start);
    if (it != graph.getAdjacencyList().end()) {
        for (const auto& edge : it->second) {
            if (wheelchairOnly_) {
                auto sIt = graph.getStations().find(edge.to);
                if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                    continue;
                }
            }
            double edgeTime = edge.time + (simulateDelays_ ? edge.delayMin : 0.0);
            State initial{edge.to, edge.line, 0, 1, edge.distance, edgeTime, edge.fare};
            std::string key = edge.to + "|" + edge.line;
            best[key] = {0, 1};
            pq.push(initial);
            parent[key] = {start, "", edge.distance, edgeTime, edge.fare};
        }
    }

    int visitedNodes = 0;
    bool found = false;
    State finalState;

    while (!pq.empty()) {
        State curr = pq.top();
        pq.pop();
        visitedNodes++;

        if (curr.station == end) {
            found = true;
            finalState = curr;
            break;
        }

        std::string currKey = curr.station + "|" + curr.line;
        auto bestIt = best.find(currKey);
        if (bestIt != best.end() && (curr.transfers > bestIt->second.first || 
            (curr.transfers == bestIt->second.first && curr.stops > bestIt->second.second))) {
            continue;
        }

        auto adjIt = graph.getAdjacencyList().find(curr.station);
        if (adjIt != graph.getAdjacencyList().end()) {
            for (const auto& edge : adjIt->second) {
                if (wheelchairOnly_) {
                    auto sIt = graph.getStations().find(edge.to);
                    if (sIt != graph.getStations().end() && !sIt->second.wheelchair) {
                        continue;
                    }
                }
                int nextTransfers = curr.transfers + (curr.line != edge.line ? 1 : 0);
                int nextStops = curr.stops + 1;
                double nextDist = curr.dist + edge.distance;
                double edgeTime = edge.time + (simulateDelays_ ? edge.delayMin : 0.0);
                double nextTime = curr.time + edgeTime;
                double nextFare = curr.fare + edge.fare;

                std::string nextKey = edge.to + "|" + edge.line;
                auto nextBestIt = best.find(nextKey);
                if (nextBestIt == best.end() || nextTransfers < nextBestIt->second.first || 
                    (nextTransfers == nextBestIt->second.first && nextStops < nextBestIt->second.second)) {
                    best[nextKey] = {nextTransfers, nextStops};
                    pq.push({edge.to, edge.line, nextTransfers, nextStops, nextDist, nextTime, nextFare});
                    parent[nextKey] = {curr.station, curr.line, edge.distance, edgeTime, edge.fare};
                }
            }
        }
    }

    if (!found) {
        return result;
    }

    std::vector<std::string> path;
    std::string currStation = finalState.station;
    std::string currLine = finalState.line;
    
    result.distance = finalState.dist;
    result.time = finalState.time;
    result.fare = finalState.fare;
    result.stations = finalState.stops + 1;
    result.interchanges = finalState.transfers;

    while (!currStation.empty()) {
        path.push_back(currStation);
        std::string key = currStation + "|" + currLine;
        auto pIt = parent.find(key);
        if (pIt == parent.end()) {
            break;
        }
        currStation = pIt->second.station;
        currLine = pIt->second.line;
    }
    std::reverse(path.begin(), path.end());
    result.route = path;

    auto endTime = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> duration = endTime - startTime;
    result.stats.executionTimeMs = duration.count();
    result.stats.nodesVisited = visitedNodes;
    result.stats.memoryUsageBytes = best.size() * (sizeof(std::string) + sizeof(std::pair<int, int>)) + parent.size() * (sizeof(std::string) + sizeof(ParentInfo));

    return result;
}
