## ADDED Requirements

### Requirement: Persist seen state per user and listing
The system SHALL persist a seen-listing record for the authenticated user when the user clicks a job listing, keyed by user and listing so the state is user-specific and durable across sessions.

#### Scenario: First click marks listing as seen
- **WHEN** an authenticated user clicks a listing that has not been seen by that user
- **THEN** the system stores that listing as seen for that user

#### Scenario: Repeated clicks are idempotent
- **WHEN** an authenticated user clicks a listing that is already marked as seen for that user
- **THEN** the system keeps a single seen state without creating duplicates

### Requirement: Listing responses include seen status
The system SHALL provide seen status for each listing relative to the authenticated user so clients can render seen and unseen listings differently.

#### Scenario: Seen listing is flagged in results
- **WHEN** the authenticated user requests listings and has previously clicked one of the returned listings
- **THEN** the response marks that listing as seen for that user

#### Scenario: Unseen listing is flagged in results
- **WHEN** the authenticated user requests listings and has not clicked a returned listing
- **THEN** the response marks that listing as unseen for that user

### Requirement: Seen listings render with visited-style visual treatment
The client SHALL render seen listings with a purple link color and improved row styling to make seen state visually distinct from unseen listings.

#### Scenario: Listing turns purple after one click
- **WHEN** a user clicks a listing link
- **THEN** that listing link is rendered with the seen-state purple color

#### Scenario: Seen style persists across refresh
- **WHEN** a user refreshes the listings page after clicking a listing
- **THEN** previously seen listings continue rendering with seen-state row and link styling
