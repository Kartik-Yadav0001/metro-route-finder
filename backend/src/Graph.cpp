#include "Graph.h"

#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <queue>
#include <unordered_set>

void Graph::addStation(const Station& station) {
    if (station.id.empty()) {
        throw std::invalid_argument("Station ID cannot be empty");
    }
    if (station.name.empty()) {
        throw std::invalid_argument("Station name cannot be empty");
    }
    if (hasStation(station.id)) {
        throw std::invalid_argument("Station ID already exists");
    }
    stations[station.id] = station;
    adjacencyList.try_emplace(station.id);
}

bool Graph::updateStation(const std::string& id, const Station& updatedStation) {
    if (updatedStation.name.empty()) {
        return false;
    }

    const auto stationIterator = stations.find(id);
    if (stationIterator == stations.end()) {
        return false;
    }

    Station replacement = updatedStation;
    replacement.id = id;
    stationIterator->second = replacement;
    adjacencyList.try_emplace(id);
    return true;
}

bool Graph::removeStation(const std::string& id) {
    if (stations.erase(id) == 0) {
        return false;
    }

    adjacencyList.erase(id);
    for (auto& pair : adjacencyList) {
        auto& edges = pair.second;
        edges.erase(
            std::remove_if(edges.begin(), edges.end(), [&](const Edge& edge) { return edge.to == id; }),
            edges.end());
    }

    return true;
}

bool Graph::addEdge(const std::string& from, const std::string& to, double distance, double time, double fare, const std::string& line, const std::string& status, double delayMin) {
    // Validate stations exist
    if (!hasStation(from) || !hasStation(to)) {
        return false;
    }
    
    // Prevent self-loops
    if (from == to) {
        return false;
    }
    
    // Validate weights
    if (!isValidWeight(distance) || !isValidWeight(time) || !isValidWeight(fare)) {
        return false;
    }
    
    // Validate line name
    if (line.empty()) {
        return false;
    }
    
    // Prevent duplicate edges
    if (edgeExists(from, to)) {
        return false;
    }
    
    adjacencyList[from].push_back({to, distance, time, fare, line, status, delayMin});
    adjacencyList[to].push_back({from, distance, time, fare, line, status, delayMin});
    return true;
}

bool Graph::updateEdge(const std::string& from, const std::string& to, double distance, double time, double fare, const std::string& line, const std::string& status, double delayMin) {
    if (!isValidWeight(distance) || !isValidWeight(time) || !isValidWeight(fare) || line.empty()) {
        return false;
    }

    bool updated = false;

    auto updateSide = [&](const std::string& source, const std::string& target) {
        auto adjacencyIterator = adjacencyList.find(source);
        if (adjacencyIterator == adjacencyList.end()) {
            return;
        }

        for (auto& edge : adjacencyIterator->second) {
            if (edge.to == target) {
                edge.distance = distance;
                edge.time = time;
                edge.fare = fare;
                edge.line = line;
                edge.status = status;
                edge.delayMin = delayMin;
                updated = true;
            }
        }
    };

    updateSide(from, to);
    updateSide(to, from);
    return updated;
}

bool Graph::removeEdge(const std::string& from, const std::string& to) {
    bool removed = false;

    auto removeSide = [&](const std::string& source, const std::string& target) {
        auto adjacencyIterator = adjacencyList.find(source);
        if (adjacencyIterator == adjacencyList.end()) {
            return;
        }

        auto& edges = adjacencyIterator->second;
        const auto beforeSize = edges.size();
        edges.erase(
            std::remove_if(edges.begin(), edges.end(), [&](const Edge& edge) { return edge.to == target; }),
            edges.end());
        removed = removed || edges.size() != beforeSize;
    };

    removeSide(from, to);
    removeSide(to, from);
    return removed;
}

const std::unordered_map<std::string, Station>& Graph::getStations() const noexcept {
    return stations;
}

const std::unordered_map<std::string, std::vector<Edge>>& Graph::getAdjacencyList() const noexcept {
    return adjacencyList;
}

bool Graph::hasStation(const std::string& id) const noexcept {
    return stations.find(id) != stations.end();
}

bool Graph::hasEdge(const std::string& from, const std::string& to) const noexcept {
    return edgeExists(from, to);
}

Graph::ValidationReport Graph::getValidationReport() const {
    ValidationReport report;
    
    // 1. Check all stations have valid IDs and names, and check for duplicates implicitly (map structure avoids duplicates but we check files load results)
    for (const auto& pair : stations) {
        if (pair.first.empty() || pair.second.id.empty() || pair.second.name.empty()) {
            report.isValid = false;
            report.errors.push_back("Station with empty ID, name or line found: ID='" + pair.first + "'.");
        }
    }
    
    // 2. Check all edges have valid weights, no self loops, valid destinations, and no duplicate edges on same line
    for (const auto& pair : adjacencyList) {
        const std::string& from = pair.first;
        const auto& edges = pair.second;
        
        // Track unique connections by "target|line" to detect duplicates on the same line
        std::unordered_set<std::string> seenConnections;
        
        for (const auto& edge : edges) {
            // Check self loops
            if (from == edge.to) {
                report.isValid = false;
                report.errors.push_back("Self-loop detected: station '" + from + "' connects to itself.");
            }
            
            // Check weights
            if (!isValidWeight(edge.distance) || !isValidWeight(edge.time) || !isValidWeight(edge.fare)) {
                report.isValid = false;
                report.errors.push_back("Invalid connection weights from '" + from + "' to '" + edge.to + "' on line '" + edge.line + "'. Weights must be positive numbers.");
            }
            
            // Check target station exists
            if (!hasStation(edge.to)) {
                report.isValid = false;
                report.errors.push_back("Connection from '" + from + "' refers to non-existent target station '" + edge.to + "'.");
            }
            
            // Check duplicate connections on the same line
            std::string connectionKey = edge.to + "|" + edge.line;
            if (seenConnections.find(connectionKey) != seenConnections.end()) {
                report.isValid = false;
                report.errors.push_back("Duplicate connection detected between '" + from + "' and '" + edge.to + "' on line '" + edge.line + "'.");
            } else {
                seenConnections.insert(connectionKey);
            }
        }
    }
    
    // 3. Check for isolated stations (nodes with degree 0)
    for (const auto& stationPair : stations) {
        auto it = adjacencyList.find(stationPair.first);
        if (it == adjacencyList.end() || it->second.empty()) {
            report.warnings.push_back("Isolated station detected: '" + stationPair.first + "' (" + stationPair.second.name + ") has no connections.");
        }
    }
    
    // 4. Check connectivity (Breadth-First Search)
    if (!stations.empty()) {
        std::unordered_map<std::string, bool> visited;
        std::queue<std::string> queue;
        
        std::string startNode = stations.begin()->first;
        visited[startNode] = true;
        queue.push(startNode);
        
        std::size_t visitedCount = 0;
        while (!queue.empty()) {
            std::string current = queue.front();
            queue.pop();
            visitedCount++;
            
            auto it = adjacencyList.find(current);
            if (it != adjacencyList.end()) {
                for (const auto& edge : it->second) {
                    if (!visited[edge.to] && hasStation(edge.to)) {
                        visited[edge.to] = true;
                        queue.push(edge.to);
                    }
                }
            }
        }
        
        if (visitedCount < stations.size()) {
            report.isValid = false; // We treat disconnected graph as invalid to ensure complete pathfinding accessibility
            report.errors.push_back("The metro network graph is disconnected. Only " + std::to_string(visitedCount) + " / " + std::to_string(stations.size()) + " stations are reachable from '" + startNode + "'.");
            
            for (const auto& stationPair : stations) {
                if (visited.find(stationPair.first) == visited.end()) {
                    report.warnings.push_back("Station '" + stationPair.first + "' (" + stationPair.second.name + ") is completely unreachable.");
                }
            }
        }
    }
    
    return report;
}

bool Graph::validate() const noexcept {
    try {
        return getValidationReport().isValid;
    } catch (...) {
        return false;
    }
}

bool Graph::isValidWeight(double value) const noexcept {
    return value > 0.0 && std::isfinite(value);
}

bool Graph::isValidStationId(const std::string& id) const noexcept {
    return !id.empty();
}

bool Graph::edgeExists(const std::string& from, const std::string& to) const noexcept {
    const auto it = adjacencyList.find(from);
    if (it == adjacencyList.end()) {
        return false;
    }
    
    for (const auto& edge : it->second) {
        if (edge.to == to) {
            return true;
        }
    }
    return false;
}
