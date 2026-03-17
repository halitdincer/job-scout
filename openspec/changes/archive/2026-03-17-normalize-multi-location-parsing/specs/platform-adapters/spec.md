## MODIFIED Requirements

### Requirement: Ashby adapter
The Ashby adapter SHALL return `is_listed` from the `isListed` boolean field in the API response. The Ashby adapter SHALL normalize all location values to plain strings and SHALL include both primary and secondary locations in the returned `locations` array without serializing objects.

#### Scenario: Ashby returns is_listed from API
- **WHEN** an Ashby job has `isListed=true`
- **THEN** the normalized `is_listed` is `True`

#### Scenario: Ashby unlisted job
- **WHEN** an Ashby job has `isListed=false`
- **THEN** the normalized `is_listed` is `False`

#### Scenario: Secondary location objects are normalized
- **WHEN** an Ashby job includes `secondaryLocations` entries as objects with a `location` field
- **THEN** each returned `locations` entry is that plain `location` string

#### Scenario: No object stringification in locations
- **WHEN** an Ashby job includes non-string secondary location structures
- **THEN** the adapter does not emit serialized dict/object text in the `locations` array

## ADDED Requirements

### Requirement: Adapter location output contract
Every platform adapter SHALL return `locations` as `list[str]` where each element is a single, human-readable location name suitable for `LocationTag.name` creation.

#### Scenario: Adapter emits string-only locations
- **WHEN** any adapter returns a listing
- **THEN** `locations` contains only string elements

#### Scenario: Adapter emits logical single locations
- **WHEN** a source API provides multiple location entries
- **THEN** each entry in `locations` corresponds to one logical location value, not a serialized object
