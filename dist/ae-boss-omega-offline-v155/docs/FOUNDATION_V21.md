# Foundation v21

v21 upgrades v20 from transaction logging to recovery-aware execution. A restart reads the journal, skips committed steps, records JOB_RESUME, and continues from the first uncommitted step. Fencing and lease checks protect commits from stale runtimes.
