#include "FileManager.h"
#include "RouteFinder.h"
#include <iostream>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace {

json serializeStats(const AlgorithmStats& s) {
    return json{
        {"algorithmName", s.algorithmName},
        {"executionTimeMs", s.executionTimeMs},
        {"nodesVisited", s.nodesVisited},
        {"memoryUsageBytes", s.memoryUsageBytes}
    };
}

json serializeRoute(const RouteResult& r) {
    return json{
        {"route", r.route},
        {"distance", r.distance},
        {"time", r.time},
        {"fare", r.fare},
        {"stations", r.stations},
        {"interchanges", r.interchanges},
        {"stats", serializeStats(r.stats)}
    };
}

json serializeGraphStats(const GraphStats& s) {
    return json{
        {"totalStations", s.totalStations},
        {"totalConnections", s.totalConnections},
        {"totalLines", s.totalLines},
        {"connectedComponents", s.connectedComponents},
        {"averageDegree", s.averageDegree},
        {"graphDensity", s.graphDensity},
        {"longestRoute", {
            {"from", s.longestRouteFrom},
            {"to", s.longestRouteTo},
            {"distance", s.longestRouteDistance}
        }},
        {"shortestRoute", {
            {"from", s.shortestRouteFrom},
            {"to", s.shortestRouteTo},
            {"distance", s.shortestRouteDistance}
        }},
        {"mostConnectedStation", {
            {"id", s.mostConnectedStationId},
            {"degree", s.mostConnectedStationDegree}
        }}
    };
}

json serializeMST(const RouteFinder::MSTResult& m) {
    json edgesArray = json::array();
    for (const auto& edge : m.edges) {
        edgesArray.push_back({
            {"from", edge.from},
            {"to", edge.to},
            {"distance", edge.distance},
            {"line", edge.line}
        });
    }
    return json{
        {"edges", edgesArray},
        {"totalDistance", m.totalDistance},
        {"stats", serializeStats(m.stats)}
    };
}

json serializeValidationReport(const Graph::ValidationReport& r) {
    return json{
        {"isValid", r.isValid},
        {"errors", r.errors},
        {"warnings", r.warnings}
    };
}

void printUsage() {
    std::cout << "Metro Route Finder JSON CLI\n";
    std::cout << "Usage:\n";
    std::cout << "  MetroRouteFinder --stats\n";
    std::cout << "  MetroRouteFinder --mst\n";
    std::cout << "  MetroRouteFinder --cycle\n";
    std::cout << "  MetroRouteFinder --validate\n";
    std::cout << "  MetroRouteFinder --route <start> <end> <mode>\n";
    std::cout << "  MetroRouteFinder --compare <start> <end>\n\n";
    std::cout << "Modes:\n";
    std::cout << "  shortest, fastest, cheapest, fewest_stops, dfs, astar, bidirectional_bfs, bidirectional_dijkstra, floyd_warshall, k_shortest, ranked\n";
}

} // namespace

int main(int argc, char* argv[]) {
    // Suppress warnings on stderr, load the graph
    Graph graph;
    try {
        graph = FileManager::loadSampleGraph();
    } catch (const std::exception& e) {
        std::cerr << "Fatal error loading database: " << e.what() << "\n";
        return 1;
    }

    RouteFinder finder(graph);

    if (argc < 2) {
        printUsage();
        return 0;
    }

    std::string command = argv[1];

    if (command == "--stats") {
        try {
            GraphStats stats = finder.getGraphStats();
            std::cout << serializeGraphStats(stats).dump(2) << "\n";
        } catch (const std::exception& e) {
            std::cout << json{{"error", e.what()}}.dump() << "\n";
        }
        return 0;
    }

    if (command == "--mst") {
        try {
            auto mst = finder.findMSTKruskal();
            std::cout << serializeMST(mst).dump(2) << "\n";
        } catch (const std::exception& e) {
            std::cout << json{{"error", e.what()}}.dump() << "\n";
        }
        return 0;
    }

    if (command == "--cycle") {
        try {
            std::vector<std::string> cyclePath;
            bool hasCycle = finder.detectCycle(cyclePath);
            std::cout << json{{"hasCycle", hasCycle}, {"cyclePath", cyclePath}}.dump(2) << "\n";
        } catch (const std::exception& e) {
            std::cout << json{{"error", e.what()}}.dump() << "\n";
        }
        return 0;
    }

    if (command == "--validate") {
        try {
            auto report = graph.getValidationReport();
            std::cout << serializeValidationReport(report).dump(2) << "\n";
        } catch (const std::exception& e) {
            std::cout << json{{"error", e.what()}}.dump() << "\n";
        }
        return 0;
    }

    if (command == "--route" && argc >= 5) {
        std::string start = argv[2];
        std::string end = argv[3];
        std::string mode = argv[4];

        for (int i = 5; i < argc; ++i) {
            std::string arg = argv[i];
            if (arg == "--wheelchair") {
                finder.setWheelchairOnly(true);
            } else if (arg == "--delay") {
                finder.setSimulateDelays(true);
            }
        }

        try {
            if (mode == "shortest") {
                std::cout << serializeRoute(finder.findShortestRoute(start, end)).dump(2) << "\n";
            } else if (mode == "fastest") {
                std::cout << serializeRoute(finder.findFastestRoute(start, end)).dump(2) << "\n";
            } else if (mode == "cheapest") {
                std::cout << serializeRoute(finder.findCheapestRoute(start, end)).dump(2) << "\n";
            } else if (mode == "fewest_stops") {
                std::cout << serializeRoute(finder.findRouteBFS(start, end)).dump(2) << "\n";
            } else if (mode == "fewest_transfers") {
                std::cout << serializeRoute(finder.findFewestTransfersRoute(start, end)).dump(2) << "\n";
            } else if (mode == "dfs") {
                std::cout << serializeRoute(finder.findRouteDFS(start, end)).dump(2) << "\n";
            } else if (mode == "astar") {
                std::cout << serializeRoute(finder.findRouteAStar(start, end, 0)).dump(2) << "\n";
            } else if (mode == "bidirectional_bfs") {
                std::cout << serializeRoute(finder.findRouteBidirectionalBFS(start, end)).dump(2) << "\n";
            } else if (mode == "bidirectional_dijkstra") {
                std::cout << serializeRoute(finder.findRouteBidirectionalDijkstra(start, end, 0)).dump(2) << "\n";
            } else if (mode == "floyd_warshall") {
                std::cout << serializeRoute(finder.findRouteFloydWarshall(start, end)).dump(2) << "\n";
            } else if (mode == "k_shortest") {
                auto paths = finder.findKShortestRoutes(start, end, 4, 0);
                json list = json::array();
                for (const auto& p : paths) {
                    list.push_back(serializeRoute(p));
                }
                std::cout << json{{"routes", list}}.dump(2) << "\n";
            } else if (mode == "ranked") {
                auto paths = finder.findRankedRoutes(start, end);
                json list = json::array();
                for (const auto& p : paths) {
                    list.push_back(serializeRoute(p));
                }
                std::cout << json{{"routes", list}}.dump(2) << "\n";
            } else {
                std::cout << json{{"error", "Unknown routing mode: " + mode}}.dump() << "\n";
            }
        } catch (const std::exception& e) {
            std::cout << json{{"error", e.what()}}.dump() << "\n";
        }
        return 0;
    }

    if (command == "--compare" && argc >= 4) {
        std::string start = argv[2];
        std::string end = argv[3];

        try {
            std::vector<RouteResult> results = {
                finder.findShortestRoute(start, end),
                finder.findRouteBFS(start, end),
                finder.findRouteDFS(start, end),
                finder.findRouteAStar(start, end, 0),
                finder.findRouteBidirectionalBFS(start, end),
                finder.findRouteBidirectionalDijkstra(start, end, 0),
                finder.findRouteFloydWarshall(start, end)
            };

            json compArray = json::array();
            for (const auto& r : results) {
                if (!r.route.empty()) {
                    compArray.push_back(serializeRoute(r));
                }
            }
            std::cout << json{{"comparison", compArray}}.dump(2) << "\n";
        } catch (const std::exception& e) {
            std::cout << json{{"error", e.what()}}.dump() << "\n";
        }
        return 0;
    }

    printUsage();
    return 0;
}
