# Foundation v23 Voice Flow

User speaks -> Speech Recognition -> transcript + confidence -> conversational intent -> existing planner -> transactional AE operations -> render/output verification.

The microphone button is intentionally only a transcription entry point: it does not bypass capability checks, approval, fencing tokens, leases, snapshots, journals, exactly-once reconciliation, cancellation or watchdogs.

For audio files, configure a transcription endpoint that accepts multipart field `audio` and returns JSON containing `text` or `transcript`, with optional `confidence`.
