#include "Admin.h"
#include "FileManager.h"

#include <cassert>
#include <iostream>

int main() {
    Graph graph = FileManager::loadSampleGraph();
    Admin admin(graph);

    Station station;
    station.id = "Z";
    station.name = "Zulu";
    station.line = "Purple";
    station.x = 900;
    station.y = 300;
    station.interchange = false;

    admin.addStation(station);
    assert(graph.hasStation("Z"));

    // 1. Test Duplicate Station ID (Must throw std::invalid_argument)
    try {
        admin.addStation(station);
        assert(false && "Should have thrown exception for duplicate station ID");
    } catch (const std::invalid_argument&) {
        // Success
    }

    // 2. Test Station with Empty Name (Must throw std::invalid_argument)
    Station emptyNameStation = station;
    emptyNameStation.id = "Z2";
    emptyNameStation.name = "";
    try {
        admin.addStation(emptyNameStation);
        assert(false && "Should have thrown exception for empty station name");
    } catch (const std::invalid_argument&) {
        // Success
    }

    // 3. Test Update Station with Empty Name (Must return false)
    Station updateEmpty = station;
    updateEmpty.name = "";
    assert(!admin.updateStation("Z", updateEmpty));

    station.name = "ZuluPrime";
    assert(admin.updateStation("Z", station));
    assert(graph.getStations().at("Z").name == "ZuluPrime");

    // 4. Test Connect Stations (Valid)
    assert(admin.connectStations("Z", "A", 11, 14, 16, "Purple"));

    // 5. Test Negative/Zero/Invalid Weights Connection (Must return false)
    assert(!admin.connectStations("Z", "B", -5, 10, 10, "Purple"));
    assert(!admin.connectStations("Z", "B", 5, 0, 10, "Purple"));
    assert(!admin.connectStations("Z", "B", 5, 10, -2, "Purple"));
    assert(!admin.connectStations("Z", "B", 5, 10, 10, "")); // empty line

    // 6. Test Self Loop Connection (Must return false)
    assert(!admin.connectStations("Z", "Z", 5, 10, 10, "Purple"));

    // 7. Test Update Connection with Invalid Weights (Must return false)
    assert(admin.updateConnection("Z", "A", 12, 15, 17, "Purple"));
    assert(!admin.updateConnection("Z", "A", -12, 15, 17, "Purple"));
    assert(!admin.updateConnection("Z", "A", 12, 15, 17, ""));

    assert(admin.deleteConnection("Z", "A"));
    assert(admin.deleteStation("Z"));
    assert(!graph.hasStation("Z"));

    std::cout << "All admin CRUD tests passed.\n";
    return 0;
}