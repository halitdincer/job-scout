## Why

Job listing links currently look the same before and after a user clicks them, which makes it hard to quickly tell what has already been reviewed. We need the first user-specific behavior so each user gets clear visual feedback when a listing has been seen.

## What Changes

- Add a user-specific "seen listing" capability that marks a listing as seen after a single click.
- Update listing presentation so seen listings use a purple visited-link style instead of the default blue style.
- Improve listing row color treatment so seen/unseen states are easier to distinguish while keeping current layout and interaction flow.

## Capabilities

### New Capabilities
- `seen-listings`: Track seen state per user and reflect that state in listing link color and row styling.

### Modified Capabilities
- None.

## Impact

- Affected code: listing UI rendering, click handling, and user-specific persistence for seen state.
- APIs: may require a read/write path for seen status per user-listing pair.
- Data: may require a new relation/table or field to store seen listings by user.
- UX: listing links for seen items should render purple consistently after one click.
