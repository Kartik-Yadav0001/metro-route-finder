#include "Admin.h"

Admin::Admin(Graph& graph) : graph(graph) {}

void Admin::addStation(const Station& station) {
    graph.addStation(station);
}

bool Admin::updateStation(const std::string& id, const Station& updatedStation) {
    return graph.updateStation(id, updatedStation);
}

bool Admin::deleteStation(const std::string& id) {
    return graph.removeStation(id);
}

bool Admin::connectStations(const std::string& from, const std::string& to, double distance, double time, double fare, const std::string& line, const std::string& status, double delayMin) {
    return graph.addEdge(from, to, distance, time, fare, line, status, delayMin);
}

bool Admin::updateConnection(const std::string& from, const std::string& to, double distance, double time, double fare, const std::string& line, const std::string& status, double delayMin) {
    return graph.updateEdge(from, to, distance, time, fare, line, status, delayMin);
}

bool Admin::deleteConnection(const std::string& from, const std::string& to) {
    return graph.removeEdge(from, to);
}
