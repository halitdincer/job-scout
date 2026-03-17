## Why

Date columns (Published At, First Seen, Last Seen, Updated At Source, Expired At) have two problems: (1) sorting is broken because the Tabulator `datetime` sorter requires Luxon which is not loaded, and (2) there is no header filter so users cannot narrow listings by time period.

## What Changes

- Fix date column sorting by replacing the Tabulator `datetime` sorter (which requires Luxon) with a custom ISO string comparator that sorts correctly without external dependencies.
- Add a `list` header filter to all five date columns with fixed preset options: "Today", "Last 7 days", "Last 14 days", "Last 30 days", "Last 90 days".
- Implement a custom `headerFilterFunc` that compares the row's ISO date value against the selected time range relative to now.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `interactive-jobs-table`: Date column sorting is fixed via a custom ISO sorter. Date columns gain header filters with preset time-range dropdown options and range-matching logic.

## Impact

- `core/templates/core/jobs.html` (Tabulator column config for date columns: sorter fix, new filter function and preset list)
- No backend/API changes required.
