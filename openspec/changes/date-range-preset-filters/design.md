## Context

Date columns currently show relative times ("2d ago") with full date on hover. Sorting is configured with `sorter: "datetime"` and `sorterParams: { format: "iso" }`, but Tabulator 6.x requires the Luxon library for the `datetime` sorter to function — and Luxon is not loaded. This means clicking sort on date columns does not produce correct ordering. Additionally, there is no header filter on date columns.

## Goals / Non-Goals

**Goals:**
- Fix date column sorting so it correctly orders by date without adding an external dependency.
- Add a dropdown filter to all five date columns with human-readable preset time ranges.
- Filter matches rows where the date falls within the selected range relative to the current moment.
- Keep existing relative time display and tooltip behavior unchanged.

**Non-Goals:**
- Adding Luxon or any date parsing library.
- Custom date range entry (from-to date pickers).
- Exact date selection.
- Backend query-level date filtering.

## Decisions

1. Replace `sorter: "datetime"` with a custom sorter function that compares ISO strings directly.
- ISO 8601 strings (`2026-03-17T14:30:00+00:00`) sort lexicographically in correct chronological order when all timestamps are UTC.
- Handle null/empty values by sorting them to the end.
- Rationale: avoids adding Luxon dependency; ISO string comparison is reliable for UTC timestamps.
- Alternative considered: adding Luxon CDN script. Rejected because it adds a dependency for something achievable with string comparison.

2. Use Tabulator `headerFilter: "list"` with a static `values` array of preset ranges.
- Options: "Today", "Last 7 days", "Last 14 days", "Last 30 days", "Last 90 days".
- Each option maps to a number of days (0, 7, 14, 30, 90) used for comparison.
- Clearable so the user can remove the filter.
- Rationale: consistent with existing dropdown filters in other columns; no external library needed.

3. Implement a custom `headerFilterFunc` that parses the row's ISO date and checks if it falls within `N` days of now.
- The filter value is the number of days as a string; the function computes the cutoff timestamp and compares.
- For "Today", compare the date portion only (same calendar day UTC).
- Rationale: simple, no timezone library needed.

4. Apply the same sorter and filter config to all five date columns for consistency.

## Risks / Trade-offs

- [ISO string sort assumption] -> Relies on all date strings being ISO 8601 UTC format. This is guaranteed by the API (`datetime.isoformat()` with Django `USE_TZ=True`).
- [UTC vs local timezone for filters] -> Comparison uses UTC. Acceptable for this use case.
- [Static preset list] -> If users want different ranges, the list must be updated in code. Acceptable given the simplicity.
