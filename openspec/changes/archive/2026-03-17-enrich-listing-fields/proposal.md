## Why

The JobListing model currently stores only title, department, location, url, and status. The platform APIs return richer data — team, employment type, workplace type, published dates, and country — that would enable better filtering and a more useful job listing experience.

## What Changes

- Add new fields to the JobListing model: `team`, `employment_type`, `workplace_type`, `country`, `published_at`, `updated_at_source`
- Add a `LocationTag` model with M2M relationship to JobListing, replacing the single `location` CharField — enables "show me all Toronto jobs" across platforms
- Update all three platform adapters (Greenhouse, Lever, Ashby) to extract and normalize these fields, returning all locations as a list
- Update ingestion logic to persist the new fields and create/link LocationTag records
- Update the jobs page and API to expose the new fields
- Add workplace type, employment type, and location filters to the jobs page

## Field Mapping Across Platforms

| Unified Field | Greenhouse | Lever | Ashby |
|---|---|---|---|
| `team` | — | `categories.team` | `team` |
| `employment_type` | — | `categories.commitment` | `employmentType` |
| `workplace_type` | — | `workplaceType` | `workplaceType` |
| `country` | parse from `location.name` | `country` | `address.postalAddress.addressCountry` |
| `published_at` | `first_published` | `createdAt` (epoch ms) | `publishedAt` |
| `updated_at_source` | `updated_at` | — | — |
| `locations` (list) | `[location.name]` (single, may contain commas) | `categories.allLocations` | `[location] + secondaryLocations` |

All new scalar fields are nullable since not every platform provides every field. Locations are stored as a M2M relationship via `LocationTag` — each unique location string gets one tag, shared across listings.

## Capabilities

### Modified Capabilities
- `job-listing-model`: Add new nullable fields to JobListing, replace `location` CharField with `LocationTag` M2M
- `platform-adapters`: Extract and normalize additional fields from each platform's API response, return locations as a list

### New Capabilities
- `location-tags`: LocationTag model with M2M to JobListing, get_or_create for deduplication
- `enriched-listing-display`: Show new fields on the jobs page and expose them via the jobs API

## Impact

- **Modified files**: `core/models.py`, `core/adapters.py`, `core/ingestion.py`, `core/views.py`, `core/templates/core/jobs.html`, migration file
- **No new dependencies**
- **Database migration**: Adds nullable columns — safe to run on existing data
- **Existing listings**: Will have null values for new fields until the next ingestion run
