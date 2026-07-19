# ER Diagram

```mermaid
erDiagram
  STATION ||--o{ CONNECTION : linked_by
  STATION {
    string id
    string name
    string line
    boolean interchange
  }
  CONNECTION {
    string from
    string to
    number distance
    number time
    number fare
    string line
  }
```
