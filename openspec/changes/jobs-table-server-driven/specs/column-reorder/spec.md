## MODIFIED Requirements

### Requirement: Persist column order
The jobs table SHALL persist the user's custom column order in `localStorage` under the key `jobscout_column_order_v2` when no saved view is loaded. When the user reloads the page, the table SHALL restore the previously saved column order from that key. When a saved view is loaded, the column order SHALL come from the saved view's `columns` payload and SHALL NOT be overwritten by the `localStorage` copy until the view is unloaded.

The `_v2` suffix reflects a one-time column-definition change; a legacy `jobscout_column_order` value SHALL be ignored rather than silently adopted, so users whose prior order referenced removed columns see the new default.

#### Scenario: Column order survives page reload
- **WHEN** a user reorders columns (with no saved view active) and reloads the page
- **THEN** the table loads with columns in the previously saved order sourced from `jobscout_column_order_v2`

#### Scenario: Saved view overrides local order
- **WHEN** a user loads a saved view whose `columns` differ from their local order
- **THEN** the table displays the view's column order; the `localStorage` copy SHALL NOT be used while the view is active

#### Scenario: New visitor sees default order
- **WHEN** a user visits the page for the first time (no `jobscout_column_order_v2` key present)
- **THEN** the table displays columns in the default definition order

#### Scenario: Legacy v1 order is ignored
- **WHEN** a user's browser has only the legacy `jobscout_column_order` key from a prior version
- **THEN** the table ignores the legacy key and renders the default order; no migration is attempted

#### Scenario: New columns appear at the end
- **WHEN** a new column is added to the codebase but is not in the persisted order
- **THEN** the new column appears at the end of the column list

#### Scenario: Removed columns are ignored
- **WHEN** the persisted order references a field that no longer exists in the column definitions
- **THEN** the unknown field is ignored and the remaining columns render in persisted order
