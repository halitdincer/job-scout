## 1. Fix date column sorting

- [x] 1.1 Add a custom `isoDateSorter` function that compares ISO strings chronologically with nulls sorted to the end
- [x] 1.2 Replace `sorter: "datetime", sorterParams: { format: "iso" }` with the custom sorter on all five date columns

## 2. Date range filter implementation

- [x] 2.1 Add a `dateRangeFilter` function that compares the row's ISO date against a preset day-range cutoff relative to now
- [x] 2.2 Define a `dateRangeFilterParams` config with static preset values (Today, Last 7/14/30/90 days) and clearable option
- [x] 2.3 Add `headerFilter`, `headerFilterParams`, and `headerFilterFunc` to all five date columns

## 3. Final verification

- [x] 3.1 Run full `pytest` suite and confirm 100% coverage remains green
