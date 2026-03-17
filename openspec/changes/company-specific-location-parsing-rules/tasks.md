## 1. Source-aware parser profile foundation (red-green)

- [x] 1.1 Add failing unit tests for source profile resolution (default profile vs Stripe profile)
- [x] 1.2 Implement source-profile registry and resolver in `core/location_normalization.py`

## 2. Stripe comma rule behavior (red-green)

- [x] 2.1 Add failing tests for Stripe comma multi-location splitting and guardrails (preserve `City, ST, CC` forms)
- [x] 2.2 Implement Stripe-specific comma parsing heuristics in normalization layer
- [x] 2.3 Add failing regression tests proving non-Stripe sources (for example Pinterest) keep current comma semantics

## 3. Ingestion integration (red-green)

- [x] 3.1 Add failing ingestion tests that pass source context and verify source-specific tokenization
- [x] 3.2 Update ingestion location sync path to use source-aware normalization profile
- [x] 3.3 Verify geocode-on-create still runs per parsed token with source-aware parsing

## 4. Remediation command integration (red-green)

- [x] 4.1 Add failing command tests for source-aware relinking during `normalize_location_tags`
- [x] 4.2 Update remediation command to parse tags with listing source profile before relinking
- [x] 4.3 Validate `--dry-run` counters and output still reflect create/relink/delete accurately

## 5. Production verification and final checks

- [x] 5.1 Run `normalize_location_tags --dry-run` against deployed DB and capture Stripe vs Pinterest sample outcomes
- [x] 5.2 Run remediation for real and then `backfill_geo --dry-run` to verify downstream geo enrichment improvements
- [x] 5.3 Run full `pytest` suite and confirm 100% coverage remains green
