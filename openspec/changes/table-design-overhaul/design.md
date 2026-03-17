## Context

The jobs page uses Tabulator with the `midnight` theme loaded via CDN. Custom CSS overrides exist in `style.css` but are minimal. The current `full-bleed` layout removes all padding so the table touches the viewport edges. Links inside cells use `var(--accent)` but blend into the dark background. Header filters and pagination controls inherit Tabulator's defaults which don't match the site's dark neutral palette well.

## Goals / Non-Goals

**Goals:**
- Make links, text, and interactive elements clearly visible and readable.
- Add consistent padding/margins around the table so it doesn't touch viewport edges.
- Ensure the page never scrolls — only the table body scrolls internally.
- Change default visible columns to Title, Company, Country, City, Published At, First Seen.
- Make the table usable on mobile with horizontal scrolling for overflow columns.

**Non-Goals:**
- Changing the Tabulator theme CDN (keep midnight as base).
- Adding a completely custom design system.
- Changing the API response or backend logic.

## Decisions

1. Replace `full-bleed` with a padded container layout.
- Add padding to the `main` element on the jobs page so the table has breathing room.
- Use `calc(100vh - navbar - toolbar - padding)` for the table height so it fills remaining space without causing page scroll.
- Rationale: controlled layout prevents page-level overflow while keeping the table internally scrollable.

2. Override Tabulator midnight theme CSS for better dark-theme contrast.
- Increase link color brightness and add underline on hover for discoverability.
- Style header cells with slightly brighter text and subtle bottom border.
- Add row hover background that is distinct but not jarring.
- Style header filter inputs/selects to match the site's dark form controls.
- Style pagination controls (buttons, page info) to match the dark palette.
- Rationale: the midnight theme is a good base but needs adjustments for this specific background and text color palette.

3. Change default visible columns.
- Visible: Title, Company, Country, City, Published At, First Seen.
- Hidden: Location (Raw), Type, Department, Workplace, Region, Status, Last Seen, Team, Updated At Source, Expired At, External ID, Source ID, ID.
- Rationale: Country and City are more useful for filtering/scanning than raw location text and employment type.

4. Mobile responsiveness.
- On narrow viewports, allow the table to scroll horizontally.
- Reduce column min-widths where possible for better fit.
- Ensure the toolbar and column chooser remain usable on mobile.
- Rationale: Tabulator handles horizontal scroll natively; we just need to not prevent it.

## Risks / Trade-offs

- [CSS specificity battles] -> Use `#jobs-grid .tabulator` prefix for all overrides to ensure they win over the CDN theme.
- [Viewport height calculation fragility] -> Use CSS `calc()` with known fixed heights (navbar 56px, toolbar ~41px, padding). If navbar height changes, this needs updating.
