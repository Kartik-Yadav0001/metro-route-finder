#include "MetroLine.h"

MetroLine::MetroLine(const std::string& name, const std::string& color)
    : name(name), color(color) {}

const std::string& MetroLine::getName() const noexcept {
    return name;
}

const std::string& MetroLine::getColor() const noexcept {
    return color;
}

void MetroLine::addStation(const std::string& stationId) {
    stations.push_back(stationId);
}

const std::vector<std::string>& MetroLine::getStations() const noexcept {
    return stations;
}
