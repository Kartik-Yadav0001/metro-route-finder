#pragma once

#include "Graph.h"

class Admin {
public:
    explicit Admin(Graph& graph);
    void addStation(const Station& station);
    bool updateStation(const std::string& id, const Station& updatedStation);
    bool deleteStation(const std::string& id);
    bool connectStations(const std::string& from, const std::string& to, double distance, double time, double fare, const std::string& line, const std::string& status = "Normal", double delayMin = 0.0);
    bool updateConnection(const std::string& from, const std::string& to, double distance, double time, double fare, const std::string& line, const std::string& status = "Normal", double delayMin = 0.0);
    bool deleteConnection(const std::string& from, const std::string& to);

private:
    Graph& graph;
};
