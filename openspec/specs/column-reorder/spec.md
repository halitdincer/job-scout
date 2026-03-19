## ADDED Requirements

### Requirement: Drag-and-drop column reordering
The jobs table SHALL support drag-and-drop column reordering. Users SHALL be able to click and drag a column header to move it to a new position in the table. The table SHALL provide visual feedback during the drag operation.

#### Scenario: Drag column to new position
- **WHEN** a user drags the "Company" column header and drops it before the "Title" column
- **THEN** the "Company" column appears to the left of "Title" in the table

#### Scenario: Visual feedback during drag
- **WHEN** a user begins dragging a column header
- **THEN** a visual indicator shows the column being moved and the target drop position

### Requirement: Persist column order
The jobs table SHALL persist the user's custom column order in `localStorage`. When the user reloads the page, the table SHALL restore the previously saved column order. The persistence key SHALL be `jobscout_column_order`.

#### Scenario: Column order survives page reload
- **WHEN** a user reorders columns and reloads the page
- **THEN** the table loads with columns in the previously saved order

#### Scenario: New visitor sees default order
- **WHEN** a user visits the page for the first time (no persisted order)
- **THEN** the table displays columns in the default definition order

#### Scenario: New columns appear at the end
- **WHEN** a new column is added to the codebase but is not in the persisted order
- **THEN** the new column appears at the end of the column list

#### Scenario: Removed columns are ignored
- **WHEN** the persisted order references a field that no longer exists in the column definitions
- **THEN** the unknown field is ignored and the remaining columns render in persisted order

### Requirement: Reset column order
The jobs toolbar SHALL include a "Reset Columns" button that restores the default column order. Clicking the button SHALL clear the persisted order from `localStorage` and reorder the table columns to match the default definition order.

#### Scenario: Reset restores default order
- **WHEN** a user has a custom column order and clicks the "Reset Columns" button
- **THEN** the table columns revert to the default definition order

#### Scenario: Reset clears persisted order
- **WHEN** a user clicks the "Reset Columns" button and reloads the page
- **THEN** the table loads with the default column order (not the previously customized order)
