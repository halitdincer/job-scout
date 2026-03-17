## Context

Location ingestion currently trusts adapter `locations` output as already normalized, then creates one `LocationTag` per item. In production data, this has produced two classes of bad tags: (1) composite location strings that bundle multiple locations into one tag, and (2) Ashby `secondaryLocations` objects stringified into tag names. These malformed tags reduce filter quality and geo enrichment accuracy.

This change crosses adapters, ingestion, and data remediation. It must preserve idempotent ingestion behavior, avoid data loss in existing listing-tag relationships, and remain safe to run in production.

## Goals / Non-Goals

**Goals:**
- Ensure adapters return clean location name strings only.
- Ensure ingestion stores one logical location per `LocationTag` even when raw inputs are composite.
- Provide a remediation path to normalize existing malformed/composite tags and re-link listings.
- Ensure geo enrichment operates on normalized tags after remediation.

**Non-Goals:**
- Perfect semantic parsing of every human-written location phrase.
- Replacing LocationTag with a fully canonical geographic entity model.
- Adding new `/api/jobs/` fields or changing response shape.

## Decisions

**1. Normalize at adapter boundary first**
- Implement adapter-level location extraction so each adapter emits `list[str]` with plain strings only.
- For Ashby, extract `secondaryLocations[*].location` when elements are objects; ignore non-string/non-dict invalid values.
- Rationale: normalizing closest to source prevents downstream code from handling mixed types.
- Alternative considered: normalize only in ingestion. Rejected because it hides adapter contract violations and complicates debugging.

**2. Add ingestion tokenization for composite strings**
- Add a splitter for known delimiters (initial set: semicolon, slash with spaces, and standalone `or`) and trim/deduplicate tokens.
- Do not split on plain comma globally to avoid breaking single-location forms like `City, ST`.
- Rationale: high-value correction with low false-positive risk.
- Alternative considered: split on commas and regex-heavy NLP. Rejected due to high risk of over-splitting valid single locations.

**3. Introduce explicit remediation command for existing data**
- Add a management command to scan malformed/composite tags, derive normalized tokens, create/reuse normalized tags, re-link listings, and optionally delete obsolete tags when unreferenced.
- Include `--dry-run` for safe preview and counters for created/relinked/deleted/skipped.
- Rationale: historical bad data cannot be fixed by ingestion changes alone.
- Alternative considered: one-off SQL/manual admin cleanup. Rejected because it is error-prone and not repeatable.

**4. Reuse existing geocoding path after normalization**
- New tags created during ingestion/remediation follow existing `geocode_location` behavior.
- Existing already-normalized tags are left untouched by remediation unless explicitly targeted.
- Rationale: minimizes new logic and preserves existing tested geo behavior.

## Risks / Trade-offs

- [False-positive splitting] -> Keep delimiter set conservative and skip ambiguous patterns; refine via tests from observed data.
- [False-negative splitting] -> Accept some composites may remain; remediation command can be rerun as rules improve.
- [Accidental relationship loss during remediation] -> Re-link before delete, delete only tags with zero references, and support dry-run with detailed output.
- [Long remediation runtime] -> Batch database operations where possible and report progress for safe operational use.
- [Geo API rate impact during remediation] -> Reuse existing rate-limited geocode flow when creating new tags.

## Migration Plan

1. Deploy adapter and ingestion normalization changes.
2. Run remediation command in `--dry-run` mode and review counts/sample output.
3. Run remediation command without dry-run.
4. Run `backfill_geo --dry-run` and then full backfill if new unmapped tags were introduced.
5. Validate `/api/jobs/` location/region/city outputs for known affected sources.

Rollback:
- Code rollback is straightforward.
- Data rollback is partial; before remediation, export affected tag/listing mappings so links can be restored if required.

## Open Questions

- Should delimiter/tokenization rules be configurable via settings or fixed in code?
- Should remediation auto-delete unreferenced malformed tags by default, or require an explicit `--delete-obsolete` flag?
