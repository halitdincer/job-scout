## Context

The jobs API returns `country`, `region`, and `city` as comma-joined strings (e.g., `"US-CA, US-NY"`). Tabulator's built-in `valuesLookup` list filter treats each unique string as a distinct filter option. This means `"US-CA, US-NY"` and `"US-CA"` appear as separate options and selecting `"US-CA"` does not match listings that include it alongside other values.

The fix spans two layers: API response shape and frontend filter behavior.

## Goals / Non-Goals

**Goals:**
- Return geo fields as arrays so each value is individually addressable.
- Make Tabulator filters extract and match individual geo values from arrays.
- Display array values as comma-separated text in cells for readability.

**Non-Goals:**
- Changing backend models or ingestion logic.
- Adding multi-select filter behavior (single-select on individual values is sufficient).
- Changing the `locations` array structure in the API response.

## Decisions

1. Return arrays instead of joined strings in the API.
- Change `country`, `region`, `city` from `"US-CA, US-NY"` / `null` to `["US-CA", "US-NY"]` / `[]`.
- Rationale: arrays are the natural representation; the frontend can format for display. Avoids parsing strings back into arrays client-side.
- Alternative considered: keep API strings and parse in JS. Rejected because it is fragile and duplicates delimiter logic.

2. Use Tabulator custom `headerFilterFunc` for array-contains matching.
- When user selects `"US-CA"`, the filter function checks whether the row's array includes that value.
- Use a custom `headerFilterFuncParams` with `valuesLookup` that flattens all row arrays into unique individual values for the dropdown.
- Rationale: Tabulator supports custom filter functions natively; no external dependency needed.

3. Use a cell formatter to join array values for display.
- Each geo column gets a formatter that joins the array with `", "` for human-readable display.
- Rationale: keeps cell rendering clean without changing data structure.

## Risks / Trade-offs

- [API response shape change] -> This is a breaking change for any consumer expecting strings. Currently only the built-in frontend consumes this API, so risk is minimal.
- [Empty array vs null] -> Use empty array `[]` instead of `null` for consistency and to avoid null checks in JS filter logic.
