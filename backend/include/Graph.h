#pragma once

#include "Station.h"
#include <string>
#include <unordered_map>
#include <vector>

struct Edge {
    std::string to;
    double distance = 0.0;
    double time = 0.0;
    double fare = 0.0;
    std::string line;
    std::string status = "Normal";
    double delayMin = 0.0;
};

class Graph {
public:
    void addStation(const Station& station);
    bool updateStation(const std::string& id, const Station& updatedStation);
    bool removeStation(const std::string& id);
    bool addEdge(const std::string& from, const std::string& to, double distance, double time, double fare, const std::string& line, const std::string& status = "Normal", double delayMin = 0.0);
    bool updateEdge(const std::string& from, const std::string& to, double distance, double time, double fare, const std::string& line, const std::string& status = "Normal", double delayMin = 0.0);
    bool removeEdge(const std::string& from, const std::string& to);
    const std::unordered_map<std::string, Station>& getStations() const noexcept;
    const std::unordered_map<std::string, std::vector<Edge>>& getAdjacencyList() const noexcept;
    bool hasStation(const std::string& id) const noexcept;
    bool hasEdge(const std::string& from, const std::string& to) const noexcept;
    
    struct ValidationReport {
        bool isValid = true;
        std::vector<std::string> errors;
        std::vector<std::string> warnings;
    };
    
    ValidationReport getValidationReport() const;
    bool validate() const noexcept;

private:
    std::unordered_map<std::string, Station> stations;
    std::unordered_map<std::string, std::vector<Edge>> adjacencyList;
    
    bool isValidWeight(double value) const noexcept;
    bool isValidStationId(const std::string& id) const noexcept;
    bool edgeExists(const std::string& from, const std::string& to) const noexcept;
};
