## Context

The listings UI currently does not preserve per-user interaction state for viewed jobs, so users cannot quickly scan which listings they already opened. This is the first user-specific feature for listings, so the implementation should establish a simple and extensible pattern for storing user-to-listing state while keeping the existing browsing flow unchanged.

## Goals / Non-Goals

**Goals:**
- Record a listing as seen after a single user click.
- Persist seen state per user so state is available across sessions/devices.
- Render seen listing links in a purple visited-like color and improve row-level visual distinction.
- Keep behavior deterministic and testable in backend and UI layers.

**Non-Goals:**
- Building multi-state workflow features such as saved/applied/hidden listings.
- Reworking overall listing page layout or ranking logic.
- Introducing analytics pipelines for click tracking beyond seen-state persistence.

## Decisions

1. Persist seen state with a user-listing association.
   - Decision: Add a dedicated persistence structure keyed by `(user_id, listing_id)` with creation timestamp.
   - Rationale: A separate association scales to additional per-user listing states without polluting listing records.
   - Alternative considered: Storing user IDs in a listing-side array/JSON field. Rejected due to poor queryability and growth concerns.

2. Mark seen state on first click.
   - Decision: Trigger seen-state write when user opens a listing link.
   - Rationale: Matches user expectation that one click is sufficient and minimizes extra interactions.
   - Alternative considered: Marking on dwell time or explicit action. Rejected because it adds friction and ambiguity.

3. Drive UI style from server-backed seen state with immediate feedback.
   - Decision: Use persisted seen status to render purple link color and distinct row styling, with optimistic visual update on click.
   - Rationale: Ensures consistency across sessions while keeping UX responsive.
   - Alternative considered: Browser-only `:visited` styling. Rejected because it is not user-account-specific and cannot synchronize across devices.

## Risks / Trade-offs

- Additional read/write operations for listing interactions -> Mitigate with indexed lookup on `(user_id, listing_id)` and idempotent upsert.
- Potential UI state mismatch during transient request failures -> Mitigate with optimistic update plus retry/error fallback to server truth.
- First user-specific feature may shape future patterns -> Mitigate by keeping model naming generic enough for future listing interaction extensions.

## Migration Plan

1. Add persistence model/table for seen listings and create migration.
2. Expose seen status in listing fetch path and add seen-mark endpoint/action.
3. Update listing UI to apply seen styles and click behavior.
4. Roll out with tests covering creation idempotency, API behavior, and UI color/state rendering.
5. Rollback by removing UI dependency on seen state and reverting migration if needed.

## Open Questions

- Should bulk listing endpoints return seen flags inline or as a separate lookup map for performance/readability?
- Should seen timestamp be surfaced in UI now or only stored for future features?
