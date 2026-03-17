## Context

Location normalization currently uses global delimiter rules. This works for many values but fails for source-specific patterns where one company packs multiple locations into a single comma-delimited string. Database analysis shows Stripe has many multi-location comma blobs, while Pinterest frequently uses comma-based single-location formats (`City, ST, CC`) that must not be split globally.

The system already has (1) ingestion-time location normalization, (2) a remediation command for historical tags, and (3) geo enrichment tied to `LocationTag` records. The missing piece is source-aware parsing that can split aggressively for selected sources without creating regressions elsewhere.

## Goals / Non-Goals

**Goals:**
- Add source/company-specific location parsing rules while preserving existing global defaults.
- Introduce a Stripe-specific comma parsing rule that targets clear multi-location blobs.
- Apply the same source-aware parsing path in ingestion and remediation.
- Improve M2M location linking quality before geo enrichment/backfill.

**Non-Goals:**
- Build a universal NLP parser for all free-form locations.
- Normalize every historical malformed tag in one pass with perfect precision.
- Change API response shape or UI behavior directly.

## Decisions

1. Add a parsing profile registry keyed by source identity.
- Use a profile resolver based on `Source` identity (e.g., `platform + board_id`) to select parsing rules.
- Default profile keeps current safe split rules.
- Alternative considered: one global parser with heuristics only. Rejected due to high false positives.

2. Implement Stripe-specific comma splitting with guardrails.
- Enable comma splitting only for Stripe profile and only when the value matches multi-location indicators (for example repeated short city tokens, remote markers, or 2+ comma segments not matching simple `City, ST, CC`).
- Alternative considered: always split commas for Stripe. Rejected because Stripe still has some valid single-location comma formats.

3. Keep adapters as raw-source mappers; perform source-specific tokenization in normalization layer.
- Adapters continue returning source strings; normalization becomes source-aware and deterministic.
- Alternative considered: adapter-specific splitting. Rejected to avoid duplicating parsing logic across adapters.

4. Reuse same parser path in remediation command.
- Remediation uses listing source context to parse old tags correctly and relink M2M tags.
- Alternative considered: remediation-only custom logic. Rejected because it would diverge from ingestion behavior.

## Risks / Trade-offs

- [False-positive comma splits] -> Start with strict Stripe heuristics and test against known `City, ST, CC` samples.
- [False-negative splits remain] -> Keep remediation rerunnable and expand profile heuristics incrementally.
- [Operational churn during relinking] -> Use dry-run and counters before real remediation execution.
- [Profile sprawl over time] -> Keep profiles explicit and source-scoped with tests per profile.

## Migration Plan

1. Add source-aware parser profiles and tests.
2. Wire ingestion normalization to pass source context.
3. Wire remediation command to parse with source context per listing/tag relationship.
4. Run remediation in dry-run and then real mode.
5. Run `backfill_geo` after remediation to enrich newly normalized tags.

Rollback:
- Revert parser profile changes in code.
- Re-run remediation conservatively (or restore from pre-remediation DB backup if needed).

## Open Questions

- Should profile matching be by `board_id` only or support explicit source-name aliases?
- Should comma profile behavior be data-driven (settings) instead of hardcoded registry values?
