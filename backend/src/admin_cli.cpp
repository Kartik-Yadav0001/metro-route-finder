#include "Admin.h"
#include "FileManager.h"
#include "RouteFinder.h"

#include <iostream>
#include <limits>
#include <string>

namespace {

const std::string kStationsPath = "../database/stations.json";
const std::string kConnectionsPath = "../database/connections.json";

void clearInputBuffer() {
    if (std::cin.fail()) {
        std::cin.clear();
    }
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
}

std::string readText(const std::string& prompt) {
    std::cout << prompt;
    std::string value;
    std::getline(std::cin >> std::ws, value);
    if (value.size() >= 2 && value.front() == '"' && value.back() == '"') {
        value = value.substr(1, value.size() - 2);
    }
    return value;
}

template <typename T>
T readNumber(const std::string& prompt) {
    std::cout << prompt;
    T value{};
    std::cin >> value;
    clearInputBuffer();
    return value;
}

Station readStationFromInput(const std::string& existingId = "") {
    Station station;
    station.id = existingId.empty() ? "" : existingId;

    if (existingId.empty()) {
        station.id = readText("Station ID: ");
    }

    station.name = readText("Station Name: ");
    station.line = readText("Line: ");
    station.x = readNumber<int>("X coordinate: ");
    station.y = readNumber<int>("Y coordinate: ");
    station.interchange = readNumber<int>("Interchange (1/0): ") != 0;
    return station;
}

void printMenu() {
    std::cout << "\nMetro Admin CLI\n";
    std::cout << "1. Add station\n";
    std::cout << "2. Update station\n";
    std::cout << "3. Delete station\n";
    std::cout << "4. Add connection\n";
    std::cout << "5. Update connection\n";
    std::cout << "6. Delete connection\n";
    std::cout << "7. Show shortest route demo\n";
    std::cout << "8. Import dataset\n";
    std::cout << "9. Save dataset\n";
    std::cout << "10. Exit\n";
    std::cout << "Choice: ";
}

} // namespace

int main() {
    Graph graph = FileManager::loadSampleGraph();
    Admin admin(graph);

    bool running = true;
    while (running) {
        printMenu();

        int choice = 0;
        std::cin >> choice;
        clearInputBuffer();

        switch (choice) {
            case 1: {
                Station station = readStationFromInput();
                admin.addStation(station);
                std::cout << "Station added.\n";
                break;
            }
            case 2: {
                std::string id = readText("Station ID to update: ");
                Station station = readStationFromInput(id);
                std::cout << (admin.updateStation(id, station) ? "Station updated.\n" : "Station not found.\n");
                break;
            }
            case 3: {
                std::string id = readText("Station ID to delete: ");
                std::cout << (admin.deleteStation(id) ? "Station deleted.\n" : "Station not found.\n");
                break;
            }
            case 4: {
                const std::string from = readText("From: ");
                const std::string to = readText("To: ");
                const double distance = readNumber<double>("Distance: ");
                const double time = readNumber<double>("Time: ");
                const double fare = readNumber<double>("Fare: ");
                const std::string line = readText("Line: ");

                std::cout << (admin.connectStations(from, to, distance, time, fare, line) ? "Connection added.\n" : "Failed to add connection (invalid stations, duplicate edge, or invalid weights).\n");
                break;
            }
            case 5: {
                const std::string from = readText("From: ");
                const std::string to = readText("To: ");
                const double distance = readNumber<double>("Distance: ");
                const double time = readNumber<double>("Time: ");
                const double fare = readNumber<double>("Fare: ");
                const std::string line = readText("Line: ");

                std::cout << (admin.updateConnection(from, to, distance, time, fare, line) ? "Connection updated.\n" : "Connection not found.\n");
                break;
            }
            case 6: {
                const std::string from = readText("From: ");
                const std::string to = readText("To: ");
                std::cout << (admin.deleteConnection(from, to) ? "Connection deleted.\n" : "Connection not found.\n");
                break;
            }
            case 7: {
                RouteFinder finder(graph);
                const auto result = finder.findShortestRoute("A", "G");
                std::cout << "Route: ";
                for (std::size_t index = 0; index < result.route.size(); ++index) {
                    std::cout << result.route[index];
                    if (index + 1 < result.route.size()) {
                        std::cout << " -> ";
                    }
                }
                std::cout << "\nDistance: " << result.distance << " km\n";
                std::cout << "Time: " << result.time << " min\n";
                std::cout << "Fare: ₹" << result.fare << "\n";
                break;
            }
            case 8: {
                const std::string stationsImportPath = readText("Stations JSON path: ");
                const std::string connectionsImportPath = readText("Connections JSON path: ");
                graph = FileManager::loadGraph(stationsImportPath, connectionsImportPath);
                std::cout << "Dataset imported.\n";
                break;
            }
            case 9: {
                FileManager::saveDataset(graph, kStationsPath, kConnectionsPath);
                std::cout << "Dataset saved.\n";
                break;
            }
            case 10: {
                running = false;
                break;
            }
            default:
                std::cout << "Invalid choice.\n";
        }
    }

    return 0;
}