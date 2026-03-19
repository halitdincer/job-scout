## 1. Enable drag-and-drop column reordering

- [x] 1.1 Add `movableColumns: true` to the Tabulator constructor options in `jobs.html`
- [x] 1.2 Write test verifying the Tabulator config includes `movableColumns: true`

## 2. Persist and restore column order

- [x] 2.1 Add `columnMoved` event handler that saves the current column order (array of field names) to `localStorage` under key `jobscout_column_order`
- [x] 2.2 Add page-load logic to read persisted order from `localStorage` and re-sort `COLUMN_DEFS` before passing to Tabulator — unknown fields are filtered out, new fields are appended at the end
- [x] 2.3 Write tests verifying persistence: order saved on column move, restored on load, stale fields handled, new fields appended

## 3. Reset column order

- [x] 3.1 Add a "Reset Columns" button to the toolbar (next to the existing "Columns" button)
- [x] 3.2 Implement click handler that clears `jobscout_column_order` from `localStorage` and re-initializes the table with default column order
- [x] 3.3 Style the reset button consistent with existing toolbar buttons in `style.css`
- [x] 3.4 Write tests verifying the reset button clears persisted order and restores default column arrangement
