# Foundation v10 Architecture

```text
Intent → Policy → Plan → Approval → Production Runtime
                                  ↓
                       Capability Guard
                                  ↓
                         Host Governor
                                  ↓
                     Snapshot → AE Apply
                                  ↓
                     Readback / Verify
                       ↙             ↘
                    DONE          UNKNOWN
                                  ↓
                         Recovery Coordinator
```

The runtime deliberately separates authorization, execution, verification, audit and recovery. A successful transport response is not considered proof of state change.
