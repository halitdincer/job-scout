## Tasks

- [x] Update `TestRunsAPI` tests: POST returns 202 with `status="running"`; assert worker effects via DB lookups
- [x] Add `test_post_returns_202_without_running_ingestion_inline` verifying `_spawn_run` is called but `ingest_sources` is not invoked from the request thread
- [x] Add `test_spawn_run_starts_daemon_thread_targeting_execute_run` verifying threading.Thread configuration
- [x] Extract worker into `_execute_run(run_id)` in `core/views.py`
- [x] Add `_spawn_run(run_id)` thin wrapper around `threading.Thread`
- [x] Update `_trigger_run` to spawn the worker and return HTTP 202 with placeholder counters / null `finished_at`
- [x] Confirm `pytest` passes with 100% coverage maintained
