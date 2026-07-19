# DFD Level 1

```mermaid
flowchart LR
  U[User] --> S1[Search Station]
  U --> S2[Find Route]
  U --> S3[View History]
  A[Admin] --> A1[Manage Stations]
  A --> A2[Manage Lines]
  S1 --> D[(JSON Data)]
  S2 --> D
  S3 --> H[(History JSON)]
  A1 --> D
  A2 --> D
```
