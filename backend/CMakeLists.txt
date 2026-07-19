cmake_minimum_required(VERSION 3.20)
project(MetroRouteFinder VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

add_library(metro_engine
    src/Graph.cpp
    src/Station.cpp
    src/MetroLine.cpp
    src/RouteFinder.cpp
    src/Admin.cpp
    src/FileManager.cpp
)

target_compile_definitions(metro_engine PRIVATE METRO_PROJECT_ROOT=\"${CMAKE_SOURCE_DIR}/..\")

add_executable(MetroRouteFinder src/main.cpp)
target_link_libraries(MetroRouteFinder metro_engine)

add_executable(MetroAdminCLI src/admin_cli.cpp)
target_link_libraries(MetroAdminCLI metro_engine)

add_executable(RouteFinderTests tests/test_routefinder.cpp)
target_link_libraries(RouteFinderTests metro_engine)

add_executable(AdminCrudTests tests/test_admin_crud.cpp)
target_link_libraries(AdminCrudTests metro_engine)

add_executable(PersistenceTests tests/test_persistence.cpp)
target_link_libraries(PersistenceTests metro_engine)
