## 1. Adapter normalization (red-green)

- [x] 1.1 Add failing adapter tests for Ashby `secondaryLocations` object normalization to plain strings and no dict-stringified outputs
- [x] 1.2 Update `core/adapters.py` to normalize Ashby location payloads into `list[str]` and pass adapter tests

## 2. Ingestion composite splitting (red-green)

- [x] 2.1 Add failing ingestion tests for composite location splitting (`;`, ` / `, `or`) and no split for `City, ST` patterns
- [x] 2.2 Implement ingestion location tokenization and deduping before `LocationTag` association
- [x] 2.3 Ensure new normalized tokens still follow existing geocode-on-create behavior with tests

## 3. Remediation command for historical data (red-green)

- [x] 3.1 Add failing tests for remediation command (`--dry-run`, relink behavior, safe delete behavior, partial/skip reporting)
- [x] 3.2 Implement remediation command to derive normalized tokens, create/reuse tags, relink listings, and conditionally delete obsolete malformed tags
- [x] 3.3 Verify remediation command against deployed data with `--dry-run` and capture sample output/counters

## 4. Geo integration validation

- [x] 4.1 Add tests confirming remediation-generated tags are compatible with `backfill_geo`
- [x] 4.2 Run `backfill_geo --dry-run` after remediation dry-run to validate downstream geo enrichment path

## 5. Final verification

- [x] 5.1 Run full test suite (`pytest`) and confirm 100% coverage remains green
- [x] 5.2 Update any affected OpenSpec base specs if implementation reveals requirement refinements
