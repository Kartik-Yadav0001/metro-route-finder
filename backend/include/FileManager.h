#pragma once

#include "Graph.h"
#include <string>

class FileManager {
public:
    static Graph loadGraph(const std::string& stationsFilePath, const std::string& connectionsFilePath);
    static Graph loadSampleGraph();
    static void saveGraph(const Graph& graph, const std::string& filePath);
    static void saveDataset(const Graph& graph, const std::string& stationsFilePath, const std::string& connectionsFilePath);

private:
    static std::string resolveDatasetPath(const std::string& relativePath);
};
