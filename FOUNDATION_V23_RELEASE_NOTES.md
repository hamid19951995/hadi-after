# AE BOSS OMEGA Foundation v23 — Voice-Enabled Autonomous Runtime

## New capabilities
- Push-to-talk voice command input using the browser/CEP Speech Recognition API.
- Persian (`fa-IR`) and English voice command routing.
- Interim transcript display and final transcript hand-off to the existing conversational agent.
- Voice commands enter the same validated planning, transactional execution, journal, lease and reconciliation path as typed commands.
- Optional audio-file transcription adapter through a configurable HTTP transcription endpoint.
- Voice envelope normalization, language detection, confidence policy and natural-language job intent conversion.

## Production boundary
The panel does not embed a cloud speech provider or hard-code credentials. Browser recognition is used when available; file transcription is delegated to a user-configured local or authorized endpoint.
