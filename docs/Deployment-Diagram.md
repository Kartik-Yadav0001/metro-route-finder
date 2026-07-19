# Deployment Diagram

```mermaid
flowchart LR
  Browser[Browser / React SPA] --> Json[JSON Data]
  Browser --> Cpp[C++ Backend Engine]
  Cpp --> Json
  Browser --> Docs[Documentation Files]
```
