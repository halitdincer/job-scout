## 1. API response shape change (red-green)

- [x] 1.1 Update API tests to expect `country`, `region`, and `city` as arrays instead of joined strings or null
- [x] 1.2 Update `list_jobs` view to return arrays for `country`, `region`, and `city`

## 2. Frontend filter and display (red-green)

- [x] 2.1 Add array-join cell formatter for Country, Region, and City columns
- [x] 2.2 Add custom `headerFilterFunc` for array-contains matching on Country, Region, and City
- [x] 2.3 Add custom `headerFilterFuncParams` with `valuesLookup` that extracts unique individual values from arrays
- [x] 2.4 Update data transform to pass arrays through instead of coercing to strings

## 3. Final verification

- [x] 3.1 Run full `pytest` suite and confirm 100% coverage remains green
