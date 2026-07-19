#include "FileManager.h"
#include "RouteFinder.h"
#include <cassert>
#include <iostream>

int main() {
    const auto graph = FileManager::loadSampleGraph();
    RouteFinder finder(graph);

    const auto shortest = finder.findShortestRoute("A", "G");
    assert(!shortest.route.empty());
    assert(shortest.route.front() == "A");
    assert(shortest.route.back() == "G");

    const auto path = finder.findFewestStopsRoute("A", "G");
    assert(path.front() == "A");
    assert(path.back() == "G");

    const auto distances = finder.floydWarshallDistances();
    assert(!distances.empty());
    assert(distances.size() == graph.getStations().size());

    assert(finder.isConnected());

    // Test Kruskal MST
    const auto mst = finder.findMSTKruskal();
    assert(mst.edges.size() == graph.getStations().size() - 1);
    assert(mst.totalDistance > 0.0);

    // Test Cycle Detection
    std::vector<std::string> cycle;
    bool hasCycle = finder.detectCycle(cycle);
    assert(hasCycle);
    assert(cycle.size() >= 3);
    assert(cycle.front() == cycle.back());

    // Test Connected Components
    const auto components = finder.getConnectedComponents();
    assert(components.size() == 1);
    assert(components.front().size() == graph.getStations().size());

    std::cout << "All route finder tests passed.\n";
    return 0;
}
