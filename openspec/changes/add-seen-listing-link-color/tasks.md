## 1. Data Model and Persistence

- [x] 1.1 Add a seen-listing persistence model keyed by user and listing with uniqueness and timestamp fields.
- [x] 1.2 Create and apply migration for the seen-listing model, including an index/constraint for idempotent writes.
- [x] 1.3 Add model-level tests for first-click creation and repeated-click idempotency.

## 2. API and Backend Flow

- [x] 2.1 Implement backend action/endpoint to mark a listing as seen when a user clicks it.
- [x] 2.2 Extend listing retrieval to include per-user seen status for each returned listing.
- [x] 2.3 Add API/service tests for seen status in listing responses and correct behavior for seen/unseen items.

## 3. Frontend Listing Experience

- [x] 3.1 Update listing click handling to trigger seen-mark logic on first click with safe retries/fallback.
- [x] 3.2 Apply seen-state styling: purple link color and improved row color treatment for seen rows.
- [x] 3.3 Add UI tests validating immediate color update on click and persistence after refresh.

## 4. Verification and Quality

- [x] 4.1 Run the full test suite and fix any regressions.
- [ ] 4.2 Manually verify seen/unseen visuals and behavior across desktop and mobile layouts.
