#pragma once

#include <string>
#include <vector>

class MetroLine {
public:
    MetroLine() = default;
    MetroLine(const std::string& name, const std::string& color);

    const std::string& getName() const noexcept;
    const std::string& getColor() const noexcept;
    void addStation(const std::string& stationId);
    const std::vector<std::string>& getStations() const noexcept;

private:
    std::string name;
    std::string color;
    std::vector<std::string> stations;
};
