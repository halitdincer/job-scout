## 1. Layout and spacing

- [x] 1.1 Update `main.full-bleed` and `#jobs-grid` CSS to add padding around the table and use `calc()` for height so only the table scrolls
- [x] 1.2 Update `.jobs-toolbar` styling for consistent margins matching the new padded layout

## 2. Tabulator theme overrides

- [x] 2.1 Restyle links in cells for better visibility (brighter color, underline on hover)
- [x] 2.2 Override header cell styling for better contrast (text color, borders, background)
- [x] 2.3 Override header filter inputs/selects to match dark form control palette
- [x] 2.4 Override pagination controls (buttons, page info, page size selector) for dark theme consistency
- [x] 2.5 Override row hover and selected states for clear but non-jarring feedback

## 3. Default column visibility

- [x] 3.1 Change default visible columns to Title, Company, Country, City, Published At, First Seen; hide Location (Raw), Type, and others

## 4. Mobile responsiveness

- [x] 4.1 Add responsive CSS for narrow viewports ensuring horizontal table scroll and usable toolbar

## 5. Final verification

- [x] 5.1 Run full `pytest` suite and confirm 100% coverage remains green
