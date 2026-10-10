# Foundation v12
Production runtime layer for real Adobe After Effects execution via ExtendScript bridge.
Includes project snapshot/restore, composition/layer/property operations, filesystem asset resolution, Render Queue commands, watchdog heartbeat, and an end-to-end autonomous animation job with rollback on failure.

Host integration requires running `runtime/ae/bridge/ae-production-runtime.jsx` inside After Effects and providing a transport that forwards governed operations to `AEBossProductionRuntime.apply`.
