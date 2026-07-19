#include "Admin.h"
#include "FileManager.h"

#include "std_filesystem.h"
#include <cassert>
#include <iostream>

int main() {
    const fs::path stationsPath = "tests/tmp_stations.json";
    const fs::path connectionsPath = "tests/tmp_connections.json";

    std::error_code ec;
    fs::remove(stationsPath, ec);
    fs::remove(connectionsPath, ec);

    Graph graph = FileManager::loadSampleGraph();
    Admin admin(graph);

    Station station;
    station.id = "Y";
    station.name = "Yellowstone";
    station.line = "Yellow";
    station.x = 840;
    station.y = 180;
    station.interchange = true;

    admin.addStation(station);
    admin.connectStations("Y", "H", 4, 5, 6, "Yellow");

    FileManager::saveDataset(graph, stationsPath.string(), connectionsPath.string());

    const Graph reloaded = FileManager::loadGraph(stationsPath.string(), connectionsPath.string());
    assert(reloaded.hasStation("Y"));
    assert(reloaded.getStations().at("Y").name == "Yellowstone");

    const auto adjacency = reloaded.getAdjacencyList().at("Y");
    bool linkedToH = false;
    for (const auto& edge : adjacency) {
        if (edge.to == "H") {
            linkedToH = true;
            assert(edge.distance == 4);
            assert(edge.time == 5);
            assert(edge.fare == 6);
            break;
        }
    }
    assert(linkedToH);

    fs::remove(stationsPath);
    fs::remove(connectionsPath);

    std::cout << "All persistence tests passed.\n";
    return 0;
}