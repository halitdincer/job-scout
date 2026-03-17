## 1. CDN Swap

- [x] 1.1 Replace AG Grid CDN script in `base.html` with Tabulator JS + midnight theme CSS from jsDelivr

## 2. Rewrite Jobs Grid

- [x] 2.1 Rewrite `jobs.html` script: replace AG Grid initialization with Tabulator — column defs, data transform, formatters, header filters, pagination
- [x] 2.2 Implement value-list header filters for categorical columns (Company, Type, Workplace, Country, Status) and text input filters for text columns (Title, Department, Locations)
- [x] 2.3 Implement relative time formatter for all date columns (First Seen, Last Seen, Published At, Updated At Source, Expired At) with tooltip showing full date-time
- [x] 2.4 Update column chooser to use Tabulator API (`table.getColumns()`, `col.isVisible()`, `col.toggle()`)
- [x] 2.5 Set default visible columns: Title, Company, Location, Type, Published At, First Seen; hide all others

## 3. Styling

- [x] 3.1 Remove AG Grid-specific CSS from `style.css`; add Tabulator theme overrides to match site dark palette if needed
- [x] 3.2 Ensure table fills viewport height below navbar + toolbar (same full-bleed layout)

## 4. Tests

- [x] 4.1 Update `test_pages.py`: change assertion from `agGrid.createGrid` to `new Tabulator`; verify Tabulator CDN is present in base template
