#pragma once

#include <string>

struct Station {
    std::string id;
    std::string name;
    std::string line;
    int x = 0;
    int y = 0;
    bool interchange = false;
    bool wheelchair = true;
    double congestion = 1.0;
    
    bool isValid() const noexcept {
        return !id.empty() && !name.empty() && !line.empty();
    }
};
