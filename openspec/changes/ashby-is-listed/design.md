## Context

Two additions: handle Ashby's `isListed` boolean during ingestion, and track when listings expire with an `expired_at` timestamp.

## Goals / Non-Goals

**Goals:**
- Mark Ashby jobs with `isListed=false` as expired during ingestion
- Record the exact timestamp when a listing transitions to expired
- Keep the adapter return format uniform across all platforms

**Non-Goals:**
- Storing `is_listed` as a model field (we just use it as an ingestion signal)
- Backfilling `expired_at` for already-expired listings (they'll remain `None`)

## Decisions

### 1. `is_listed` is an adapter-level field, not a model field

Adapters return `is_listed` (bool or None) in their dict. During ingestion, if `is_listed is False`, the listing is treated as expired. No new model field needed — it's just an ingestion signal.

- Greenhouse/Lever return `None` (no change in behavior)
- Ashby returns the boolean from `isListed`

### 2. `expired_at` set during expiration in ingestion

`expired_at = DateTimeField(null=True, blank=True)`

Two places where expiration happens:
1. **Bulk expiration** of missing listings — add `expired_at=now` to the existing `update(status="expired")` call
2. **Unlisted Ashby jobs** — during per-item processing, if `is_listed is False`, set `status="expired"` and `expired_at=now`

Already-expired listings are skipped in both paths (filtered by `status="active"`).

## Risks / Trade-offs

- [Already-expired listings won't have `expired_at`] → Acceptable; only new expirations going forward.
- [`isListed` currently always `true` in Ashby's public API] → Low risk; we handle `false` correctly if it appears.
