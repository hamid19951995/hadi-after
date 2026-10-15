# Job Envelope Schema

The canonical job envelope is the contract used by the Node-level deterministic engine. It is designed to be auditable, versionable, and deterministic across repeated runs.

## Envelope fields

- `jobId`: unique identifier for the job.
- `opId`: operation identifier that groups related work.
- `stage`: execution stage label such as `prepare`, `verify`, or `finalize`.
- `createdAt`: ISO-8601 timestamp.
- `issuer`: actor or system that created the job.
- `policy`: retry and timeout policy for execution.
- `manifestRef`: reference to the manifest or canonical artifact that this job is bound to.
- `inputs`: structured payload for the job.
- `inputHash`: SHA-256 hash over the canonicalized input payload.
- `steps`: ordered array of execution steps.
- `expectedState`: the state the engine should observe after running the job.
- `evidencePath`: output path for the receipt and trace evidence.

The schema is located at `contracts/job.schema.json` and is compatible with JSON Schema draft-07 / 2020-12 conventions.

## Valid example

```json
{
  "jobId": "job-2026-10-15-001",
  "opId": "op-verify-001",
  "stage": "verify",
  "createdAt": "2026-10-15T10:30:00.000Z",
  "issuer": "deterministic-engine",
  "policy": {
	"retries": 2,
	"timeouts": {
	  "stepMs": 15000,
	  "verificationMs": 15000
	}
  },
  "manifestRef": "test/fixtures/job-manifest.json",
  "inputs": {
	"source": "smoke-test",
	"repeatable": true
  },
  "inputHash": "sha256:5b1a87d4c6cc8f8e7f3f5f4de25e811d85ef7e0b1d7b7e75ff8cd64d8a3f2f91",
  "steps": [
	{
	  "id": "step-1",
	  "name": "generate output",
	  "type": "script",
	  "runScript": {
		"path": "test/fixtures/output-generator.js",
		"args": ["--mode", "smoke"]
	  },
	  "expectedState": {
		"status": "verified"
	  }
	},
	{
	  "id": "step-2",
	  "name": "verify manifest",
	  "type": "verify",
	  "manifestRef": "test/fixtures/job-manifest.json",
	  "expectedState": {
		"ok": true
	  }
	}
  ],
  "expectedState": {
	"status": "verified",
	"ok": true
  },
  "evidencePath": "test/evidence/receipt.json"
}
```

## Invalid example

```json
{
  "jobId": "job-2026-10-15-002",
  "stage": "verify",
  "createdAt": "not-a-date",
  "steps": [
	{
	  "id": "step-1",
	  "name": "broken",
	  "type": "script",
	  "runScript": 42
	}
  ]
}
```

This is invalid because it is missing required fields like `opId`, `issuer`, `policy`, `inputHash`, and `runScript` is not a valid string or script object.

## Validation behavior

The runtime validates a job before execution. A job is rejected when:

- required fields are missing,
- timestamps are malformed,
- the `policy` structure is incorrect,
- `steps` is empty or malformed,
- `runScript`/`manifestRef` data do not conform to the schema, or
- `expectedState` is not a valid JSON value.

This keeps the engine deterministic and prevents invalid jobs from reaching the execution pipeline.
