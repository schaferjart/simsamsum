# Collapsible Tables Implementation

## Overview
Implemented collapsible functionality for editor tables matching the exact look and feel of the control panel collapsible groups.

## Implementation Date
October 9, 2025

## Features Implemented

### 1. Matching Control Panel Style
- **Same chevron indicator**: Uses `›` character that rotates 90° when expanded, 0° when collapsed
- **Entire header is clickable**: Just like control panel groups, the whole header acts as a toggle button
- **Same transition timing**: Uses `var(--duration-fast)` and `var(--duration-normal)` for consistent animations
- **Same hover effect**: Background color changes on hover to indicate clickability

### 2. Collapsible Content
When a table is collapsed, the following elements are hidden:
- The Handsontable itself
- Column controls button
- Maximize button  
- Column toggle popup
- Vertical resizer (the one below the table)

### 3. Nice Stacking Behavior
- Collapsed tables take minimal vertical space (just the header height)
- Tables stack directly on top of each other when collapsed (no gaps)
- Smooth transitions when expanding/collapsing
- No jumpy layout shifts

### 4. State Persistence
- Collapse/expand state is saved to localStorage under key: `workflow-collapsible-tables-state`
- State persists across page reloads
- Each table is identified by its header text (e.g., "elements", "connections", "variables")

### 5. Accessibility
- Headers have proper ARIA attributes (`role="button"`, `aria-expanded`, `tabindex="0"`)
- Keyboard navigation supported (Tab to header, Enter/Space to toggle)
- Screen reader announcements for state changes

## Files Modified

### 1. `/src/style.css`
Added CSS rules for collapsible table containers:
- `.table-container.collapsible .table-header` - Clickable header with chevron
- `.table-container.collapsible .table-header::before` - Chevron indicator styling
- `.table-container.collapsed .table-header::before` - Collapsed state chevron rotation
- `.table-controls-collapsible` - Repositioned table controls inside collapsible content
- `.table-container.collapsible .table-content` - Content wrapper with transitions
- `.table-container.collapsed .table-content` - Collapsed state (hidden)
- `.table-container.collapsed + .vertical-resizer` - Hide resizer when collapsed

### 2. `/src/js/ui/collapsible-tables.js` (New File)
Created new module with the following functions:
- `getSavedState()` - Retrieves collapse state from localStorage
- `saveState(state)` - Persists collapse state to localStorage
- `toggleTableContainer(tableContainer, tableId, state)` - Toggles collapse state
- `initializeCollapsibleTables()` - Main initialization function that:
  - Finds all table containers
  - Restructures headers to separate title from controls
  - Wraps content in `.table-content` div
  - Moves table controls into collapsible content
  - Sets up click and keyboard handlers
  - Applies saved state from localStorage

### 3. `/src/js/ui/handsontable-manager.js`
Integrated collapsible tables:
- Imported `initializeCollapsibleTables` from `./collapsible-tables.js`
- Called `initializeCollapsibleTables()` in `initUIInteractions()` function
- Called after column toggles and maximize buttons are initialized

## Usage

### For Users
1. Click on any table header (e.g., "Elements", "Connections", "Variables") to collapse/expand it
2. Use Tab key to navigate to headers, then Enter or Space to toggle
3. Collapsed state persists across page reloads

### For Developers
The collapsible functionality is automatically applied to all `.table-container` elements with a `.table-header` child.

To add collapsible functionality to a new table:
```html
<div class="table-container" id="my-table-container">
    <div class="table-header">
        <h4>My Table</h4>
        <div class="table-controls">
            <!-- buttons will be moved to collapsible content -->
        </div>
    </div>
    <!-- content here will become collapsible -->
</div>
```

The initialization will automatically:
1. Add the `collapsible` class
2. Restructure the header
3. Wrap content in `.table-content`
4. Add event handlers
5. Apply saved state

## Technical Details

### DOM Restructure
**Before:**
```
.table-container
  .table-header
    h4
    .table-controls
      button (Columns)
      button (Maximize)
  .editor-table
  .column-toggle-popup
```

**After:**
```
.table-container.collapsible
  .table-header (clickable)
    h4
  .table-content (collapsible wrapper)
    .table-controls-collapsible
      button (Columns)
      button (Maximize)
    .editor-table
    .column-toggle-popup
```

### CSS Transitions
- **Chevron rotation**: 150ms with ease-in-out
- **Content collapse**: 300ms max-height + 150ms opacity
- **Smooth and natural feeling**, matching the control panel

### LocalStorage Format
```json
{
  "elements": false,
  "connections": true,
  "variables": false
}
```
- `true` = collapsed
- `false` = expanded

## Testing

See `TEST_COLLAPSIBLE_TABLES.md` for detailed testing checklist.

**Quick Test:**
1. Open http://localhost:5174
2. Click on "Elements" header - should collapse smoothly
3. Click again - should expand smoothly
4. Reload page - state should persist
5. Compare with control panel collapsible groups - should look identical

## Notes

- The vertical resizer between tables is hidden when the table above it is collapsed
- This prevents visual clutter and makes the stacked collapsed tables look cleaner
- Table controls are only accessible when the table is expanded
- The maximize functionality still works normally when tables are expanded
- Collapsible functionality is independent of maximize functionality
