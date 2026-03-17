## 1. Model Changes

- [x] 1.1 Add `country_code`, `region_code`, `city` fields to LocationTag model (nullable CharFields) + migration
- [x] 1.2 Add `geo_key` read-only property to LocationTag (returns hierarchical key or None)
- [x] 1.3 Remove `country` field from JobListing model + data migration (copy existing country values to matching LocationTag.country_code where possible)
- [x] 1.4 Write tests for new LocationTag fields, geo_key property, and country removal

## 2. Admin

- [x] 2.1 Update LocationTagAdmin: add geo fields to list_display, list_editable, and list_filter
- [x] 2.2 Write tests for LocationTag admin configuration

## 3. API Changes

- [x] 3.1 Update `/api/jobs/` response: change `locations` from string array to object array with geo fields; derive `country` from LocationTag country_codes; remove flat `country` field
- [x] 3.2 Add `GET /api/locations/` endpoint returning all LocationTags with geo fields
- [x] 3.3 Write tests for updated jobs API response shape and new locations endpoint

## 4. Frontend

- [x] 4.1 Update jobs.html grid: adapt to new locations object format, derive Country column from location country_codes
- [x] 4.2 Write tests for updated grid behavior (template renders correctly)

## 5. Ingestion

- [x] 5.1 Remove `country` from scalar_defaults in ingestion.py _process_source (field no longer exists on JobListing)
- [x] 5.2 Update ingestion tests to reflect country field removal
