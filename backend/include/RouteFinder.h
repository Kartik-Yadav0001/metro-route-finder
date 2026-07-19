#pragma once

#include "Graph.h"
#include <string>
#include <vector>
#include <unordered_map>
#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#else
#include <mutex>
#endif

class CompatMutex {
public:
    CompatMutex() {
#ifdef _WIN32
        InitializeCriticalSection(&cs);
#endif
    }
    ~CompatMutex() {
#ifdef _WIN32
        DeleteCriticalSection(&cs);
#endif
    }
    void lock() const {
#ifdef _WIN32
        EnterCriticalSection(const_cast<LPCRITICAL_SECTION>(&cs));
#else
        m.lock();
#endif
    }
    void unlock() const {
#ifdef _WIN32
        LeaveCriticalSection(const_cast<LPCRITICAL_SECTION>(&cs));
#else
        m.unlock();
#endif
    }
private:
#ifdef _WIN32
    mutable CRITICAL_SECTION cs;
#else
    mutable std::mutex m;
#endif
};

class CompatLockGuard {
public:
    explicit CompatLockGuard(const CompatMutex& mtx) : mtx_(mtx) {
        mtx_.lock();
    }
    ~CompatLockGuard() {
        mtx_.unlock();
    }
    CompatLockGuard(const CompatLockGuard&) = delete;
    CompatLockGuard& operator=(const CompatLockGuard&) = delete;
private:
    const CompatMutex& mtx_;
};

struct AlgorithmStats {
    std::string algorithmName;
    double executionTimeMs = 0.0;
    int nodesVisited = 0;
    std::size_t memoryUsageBytes = 0;
};

struct RouteResult {
    std::vector<std::string> route;
    double distance = 0.0;
    double time = 0.0;
    double fare = 0.0;
    int stations = 0;
    int interchanges = 0;
    AlgorithmStats stats;
};
struct GraphStats {
    int totalStations = 0;
    int totalConnections = 0;
    int totalLines = 0;
    int connectedComponents = 0;
    double averageDegree = 0.0;
    double graphDensity = 0.0;
    std::string longestRouteFrom;
    std::string longestRouteTo;
    double longestRouteDistance = 0.0;
    std::string shortestRouteFrom;
    std::string shortestRouteTo;
    double shortestRouteDistance = 0.0;
    std::string mostConnectedStationId;
    int mostConnectedStationDegree = 0;
};
class RouteFinder {
public:
    explicit RouteFinder(const Graph& graph);
    
    void setWheelchairOnly(bool active) noexcept { wheelchairOnly_ = active; }
    void setSimulateDelays(bool active) noexcept { simulateDelays_ = active; }

    // Existing interfaces (kept for full compatibility)
    RouteResult findShortestRoute(const std::string& start, const std::string& end) const;
    RouteResult findFastestRoute(const std::string& start, const std::string& end) const;
    RouteResult findCheapestRoute(const std::string& start, const std::string& end) const;
    std::vector<std::string> findFewestStopsRoute(const std::string& start, const std::string& end) const;
    RouteResult findFewestTransfersRoute(const std::string& start, const std::string& end) const;
    std::vector<std::vector<double>> floydWarshallDistances() const;
    bool isConnected() const;

    // Advanced DSA algorithms (new APIs)
    RouteResult findRouteBFS(const std::string& start, const std::string& end) const;
    RouteResult findRouteDFS(const std::string& start, const std::string& end) const;
    RouteResult findRouteAStar(const std::string& start, const std::string& end, int weightMode) const;
    RouteResult findRouteBidirectionalBFS(const std::string& start, const std::string& end) const;
    RouteResult findRouteBidirectionalDijkstra(const std::string& start, const std::string& end, int weightMode) const;
    RouteResult findRouteFloydWarshall(const std::string& start, const std::string& end) const;

    // Multiple paths & Ranking
    std::vector<RouteResult> findKShortestRoutes(const std::string& start, const std::string& end, int K, int weightMode) const;
    std::vector<RouteResult> findRankedRoutes(const std::string& start, const std::string& end) const;
    struct MSTEdge {
        std::string from;
        std::string to;
        double distance = 0.0;
        std::string line;
    };
    struct MSTResult {
        std::vector<MSTEdge> edges;
        double totalDistance = 0.0;
        AlgorithmStats stats;
    };

    MSTResult findMSTKruskal() const;
    bool detectCycle(std::vector<std::string>& cyclePath) const;
    std::vector<std::vector<std::string>> getConnectedComponents() const;
    GraphStats getGraphStats() const;

private:
    const Graph& graph;
    bool wheelchairOnly_ = false;
    bool simulateDelays_ = false;
    RouteResult runDijkstra(const std::string& start, const std::string& end, int weightMode) const;
    double getHeuristic(const std::string& node, const std::string& target, int weightMode) const;
    RouteResult buildResult(const std::vector<std::string>& path, const AlgorithmStats& stats) const;

    struct CacheKey {
        std::string start;
        std::string end;
        std::string mode;
        bool operator==(const CacheKey& other) const {
            return start == other.start && end == other.end && mode == other.mode;
        }
    };

    struct CacheKeyHash {
        std::size_t operator()(const CacheKey& k) const {
            return std::hash<std::string>{}(k.start) ^ 
                   (std::hash<std::string>{}(k.end) << 1) ^ 
                   (std::hash<std::string>{}(k.mode) << 2);
        }
    };

    mutable CompatMutex cacheMutex;
    mutable std::unordered_map<CacheKey, RouteResult, CacheKeyHash> routeCache;
    mutable CompatMutex vectorCacheMutex;
    mutable std::unordered_map<CacheKey, std::vector<RouteResult>, CacheKeyHash> vectorRouteCache;

    bool checkCache(const std::string& start, const std::string& end, const std::string& mode, RouteResult& result) const;
    void updateCache(const std::string& start, const std::string& end, const std::string& mode, const RouteResult& result) const;
    bool checkVectorCache(const std::string& start, const std::string& end, const std::string& mode, std::vector<RouteResult>& result) const;
    void updateVectorCache(const std::string& start, const std::string& end, const std::string& mode, const std::vector<RouteResult>& result) const;
};
