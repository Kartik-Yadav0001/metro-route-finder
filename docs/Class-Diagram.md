# Class Diagram

```mermaid
classDiagram
  class Station
  class MetroLine
  class Graph
  class RouteFinder
  class PriorityQueue
  class Admin
  class FileManager

  Graph --> Station
  Graph --> "*" Edge
  RouteFinder --> Graph
  Admin --> Graph
  FileManager --> Graph
  PriorityQueue --> RouteFinder
```
