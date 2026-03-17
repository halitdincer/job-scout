## Context

The JobListing model has 5 content fields (title, department, location, url, status). Platform APIs return significantly more data that users need for filtering and decision-making: team, employment type, workplace type, country, and publish/update timestamps.

Each platform uses different field names and formats. The adapters currently return a 5-key normalized dict. We need to extend this contract to include the new fields while keeping all new fields nullable (not every platform provides every field).

Additionally, platforms handle multi-location postings differently:
- **Greenhouse**: Single `location.name` string, sometimes comma-separated (`"Dublin, London"`)
- **Lever**: `categories.allLocations` array (`["London", "Stockholm"]`)
- **Ashby**: `location` + `secondaryLocations` array (`"London"` + `["Toronto", "New York", "Montreal"]`)

The current single `location` CharField loses multi-location data.

## Goals / Non-Goals

**Goals:**
- Add 6 new nullable scalar fields to JobListing: `team`, `employment_type`, `workplace_type`, `country`, `published_at`, `updated_at_source`
- Replace the `location` CharField with a `LocationTag` M2M model for proper multi-location support
- Normalize values across platforms (e.g., Lever `"Permanent"` → `"full_time"`)
- Update adapters to extract new fields and return locations as a list
- Update ingestion to persist new fields and sync LocationTag associations
- Display new fields on jobs page, expose in API, add location filter

**Non-Goals:**
- No backfill migration — existing listings get new data on next ingestion run
- No description/content storage (too large, separate concern)
- No location normalization (e.g., "San Francisco" vs "SF") — store as-is from platform

## Decisions

### 1. LocationTag M2M model
A `LocationTag` model with a unique `name` field. JobListing gets a `locations = ManyToManyField(LocationTag)`. Ingestion uses `get_or_create` on the name to deduplicate — "Toronto" from Lever and "Toronto" from Ashby share one tag.

The old `location` CharField is removed. The migration needs to handle the transition: create LocationTag records from existing location values, link them, then drop the column.

**Alternative**: JSON array field — rejected, harder to query and filter across listings.
**Alternative**: Concatenated string — rejected, loses the ability to filter precisely by city.

### 2. Adapters return `locations` as a list of strings
Replace the single `location` key with `locations: list[str]`. Each adapter builds the list from what the platform provides:
- Greenhouse: `[location.name]` (single item, may contain commas — keep as-is, it's the platform's representation)
- Lever: `categories.allLocations` (already a list)
- Ashby: `[location] + secondaryLocations` (combine primary + secondary)

### 3. Normalize employment_type to lowercase snake_case choices with `unknown` sentinel
Lever uses `"Permanent"`, `"Contract"`, etc. Ashby uses `"FullTime"`, `"PartTime"`, `"Contract"`, `"Intern"`. Greenhouse doesn't provide this.

Normalized choices: `full_time`, `part_time`, `contract`, `intern`, `temporary`, `unknown`. Store as CharField with choices. When a platform doesn't support a field at all, the adapter sets `"unknown"` (not None). None/null is reserved for "the platform supports this field but the job didn't specify it."

This matters for filtering — a user filtering by "Full-time" won't see Greenhouse jobs, but they can see them under "Unknown". The UI displays "Unknown" as "—" or a neutral badge.

### 4. Normalize workplace_type to lowercase choices with `unknown` sentinel
Lever and Ashby both provide this with similar values. Greenhouse doesn't.

Normalized choices: `on_site`, `remote`, `hybrid`, `unknown`. Same semantics as employment_type — `"unknown"` means the platform doesn't provide this field.

### 5. Use `updated_at_source` to avoid conflicting with Django's auto_now
Django's `auto_now` fields like `last_seen_at` auto-update. The source's update timestamp is a different concept — when the posting was last modified on the platform. Name it `updated_at_source` to be explicit.

### 6. Country as free-text string
Lever provides `country` as ISO code (`"CA"`). Ashby provides full name (`"South Korea"`). Greenhouse doesn't provide it directly.

Store as a free-text CharField (max 100) for now — each adapter stores whatever the platform provides.

### 7. Sentinel value semantics
- `"unknown"` — the platform does not provide this field at all (e.g., Greenhouse has no employment_type)
- `None` — the platform provides the field but this specific job left it blank
- A real value — the platform provided it and the job has it

Adapters are responsible for setting the correct sentinel. The normalizer helpers default unmapped values to `"unknown"`.

### 8. Keep adapter return contract additive
The adapter dict grows from 5 keys to 11 keys (replacing `location` with `locations`). All new keys are optional (default to None/empty list). Ingestion uses `dict.get()` for new fields.

## Risks / Trade-offs

- [Greenhouse has no employment/workplace type] These fields will be `"unknown"` for Greenhouse sources → Users can filter/see them under "Unknown"
- [Country not normalized] Different formats across platforms → Free text for now, normalize later if filtering needed
- [Existing data has nulls] All 1686 current listings will have null new fields until next run → Acceptable, one manual trigger fixes it
- [Greenhouse comma locations] `"Dublin, London"` stored as one LocationTag rather than two → Acceptable for now, Greenhouse doesn't give us a structured list
- [LocationTag migration] Need to migrate existing `location` data to M2M → One-time data migration in the same migration file
