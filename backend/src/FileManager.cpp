#include "FileManager.h"

#include <fstream>
#include <cstdio>
#include <sstream>
#include <stdexcept>
#include <string>
#include <chrono>
#include <iomanip>
#include <iostream>
#include <vector>
#include "std_filesystem.h"
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace {

bool fileExists(const std::string& filePath) {
    return fs::exists(filePath);
}

bool createDirectory(const std::string& dirPath) {
    try {
        fs::create_directories(dirPath);
        return true;
    } catch (const fs::filesystem_error&) {
        return false;
    }
}

std::string createBackupPath(const std::string& filePath) {
    const auto now = std::chrono::system_clock::now();
    const auto time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << filePath << ".backup_" << std::put_time(std::localtime(&time_t), "%Y%m%d_%H%M%S");
    return ss.str();
}

bool createBackup(const std::string& filePath) {
    if (!fileExists(filePath)) {
        return true; // No backup needed if file doesn't exist
    }
    
    try {
        const std::string backupPath = createBackupPath(filePath);
        fs::copy_file(filePath, backupPath);
        return true;
    } catch (const fs::filesystem_error&) {
        return false;
    }
}

} // namespace

std::string FileManager::resolveDatasetPath(const std::string& relativePath) {
    std::size_t found = relativePath.find_last_of("/\\");
    std::string filename = (found == std::string::npos) ? relativePath : relativePath.substr(found + 1);

    const std::string projectRoot = METRO_PROJECT_ROOT;
    const std::string candidates[] = {
        relativePath,
        "database/" + filename,
        "../database/" + filename,
        "../../database/" + filename,
        "../" + relativePath,
        "../../" + relativePath,
        projectRoot + "/database/" + filename
    };

    for (const auto& candidate : candidates) {
        if (fileExists(candidate)) {
            return candidate;
        }
    }

    return relativePath;
}

Graph FileManager::loadGraph(const std::string& stationsFilePath, const std::string& connectionsFilePath) {
    Graph graph;

    // Load stations
    try {
        std::ifstream input(stationsFilePath);
        if (!input.is_open()) {
            throw std::runtime_error("Unable to open stations file: " + stationsFilePath);
        }
        json arrayObj;
        input >> arrayObj;
        for (const auto& item : arrayObj) {
            Station station;
            station.id = item.value("id", "");
            station.name = item.value("name", "");
            station.line = item.value("line", "");
            station.x = item.value("x", 0);
            station.y = item.value("y", 0);
            station.interchange = item.value("interchange", false);
            station.wheelchair = item.value("wheelchair", true);
            station.congestion = item.value("congestion", 1.0);

            if (!station.id.empty()) {
                try {
                    graph.addStation(station);
                } catch (const std::exception& e) {
                    std::cerr << "Warning: skipping invalid station '" << station.id << "': " << e.what() << "\n";
                }
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error parsing stations JSON: " << e.what() << "\n";
    }

    // Load connections
    try {
        std::ifstream input(connectionsFilePath);
        if (!input.is_open()) {
            throw std::runtime_error("Unable to open connections file: " + connectionsFilePath);
        }
        json arrayObj;
        input >> arrayObj;
        for (const auto& item : arrayObj) {
            const std::string from = item.value("from", "");
            const std::string to = item.value("to", "");
            const double distance = item.value("distance", 0.0);
            const double time = item.value("time", 0.0);
            const double fare = item.value("fare", 0.0);
            const std::string line = item.value("line", "");
            const std::string status = item.value("status", "Normal");
            const double delayMin = item.value("delayMin", 0.0);

            if (!from.empty() && !to.empty()) {
                try {
                    graph.addEdge(from, to, distance, time, fare, line, status, delayMin);
                } catch (const std::exception& e) {
                    std::cerr << "Warning: skipping invalid connection from '" << from << "' to '" << to << "': " << e.what() << "\n";
                }
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error parsing connections JSON: " << e.what() << "\n";
    }

    return graph;
}

Graph FileManager::loadSampleGraph() {
    return loadGraph(resolveDatasetPath("stations.json"), resolveDatasetPath("connections.json"));
}

void FileManager::saveGraph(const Graph& graph, const std::string& filePath) {
    // Create directory if it doesn't exist
    const fs::path pathObj(filePath);
    const std::string dirPath = pathObj.parent_path().string();
    if (!dirPath.empty() && !fileExists(dirPath)) {
        if (!createDirectory(dirPath)) {
            throw std::runtime_error("Unable to create directory: " + dirPath);
        }
    }
    
    // Create backup of existing file
    createBackup(filePath);
    
    std::ofstream output(filePath);
    if (!output.is_open()) {
        throw std::runtime_error("Unable to write file: " + filePath);
    }

    json stationsArray = json::array();
    for (const auto& stationPair : graph.getStations()) {
        const auto& station = stationPair.second;
        stationsArray.push_back({
            {"id", station.id},
            {"name", station.name},
            {"line", station.line},
            {"x", station.x},
            {"y", station.y},
            {"interchange", station.interchange},
            {"wheelchair", station.wheelchair},
            {"congestion", station.congestion}
        });
    }

    json connectionsArray = json::array();
    for (const auto& adjacencyPair : graph.getAdjacencyList()) {
        const auto& from = adjacencyPair.first;
        for (const auto& edge : adjacencyPair.second) {
            if (from > edge.to) {
                continue;
            }
            connectionsArray.push_back({
                {"from", from},
                {"to", edge.to},
                {"distance", edge.distance},
                {"time", edge.time},
                {"fare", edge.fare},
                {"line", edge.line},
                {"status", edge.status},
                {"delayMin", edge.delayMin}
            });
        }
    }

    json result = {
        {"stations", stationsArray},
        {"connections", connectionsArray}
    };

    output << result.dump(2) << "\n";
}

void FileManager::saveDataset(const Graph& graph, const std::string& stationsFilePath, const std::string& connectionsFilePath) {
    // Create directories if they don't exist
    const fs::path stationsPath(stationsFilePath);
    const fs::path connectionsPath(connectionsFilePath);
    
    const std::string stationsDir = stationsPath.parent_path().string();
    const std::string connectionsDir = connectionsPath.parent_path().string();
    
    if (!stationsDir.empty() && !fileExists(stationsDir)) {
        createDirectory(stationsDir);
    }
    if (!connectionsDir.empty() && !fileExists(connectionsDir)) {
        createDirectory(connectionsDir);
    }
    
    // Create backups
    createBackup(stationsFilePath);
    createBackup(connectionsFilePath);
    
    // Save stations
    std::ofstream stationsOutput(stationsFilePath);
    if (!stationsOutput.is_open()) {
        throw std::runtime_error("Unable to open stations file for saving: " + stationsFilePath);
    }
    json stationsArray = json::array();
    for (const auto& stationPair : graph.getStations()) {
        const auto& station = stationPair.second;
        stationsArray.push_back({
            {"id", station.id},
            {"name", station.name},
            {"line", station.line},
            {"x", station.x},
            {"y", station.y},
            {"interchange", station.interchange},
            {"wheelchair", station.wheelchair},
            {"congestion", station.congestion}
        });
    }
    stationsOutput << stationsArray.dump(2) << "\n";

    // Save connections
    std::ofstream connectionsOutput(connectionsFilePath);
    if (!connectionsOutput.is_open()) {
        throw std::runtime_error("Unable to open connections file for saving: " + connectionsFilePath);
    }
    json connectionsArray = json::array();
    for (const auto& adjacencyPair : graph.getAdjacencyList()) {
        const auto& from = adjacencyPair.first;
        for (const auto& edge : adjacencyPair.second) {
            if (from > edge.to) {
                continue;
            }
            connectionsArray.push_back({
                {"from", from},
                {"to", edge.to},
                {"distance", edge.distance},
                {"time", edge.time},
                {"fare", edge.fare},
                {"line", edge.line},
                {"status", edge.status},
                {"delayMin", edge.delayMin}
            });
        }
    }
    connectionsOutput << connectionsArray.dump(2) << "\n";
}
