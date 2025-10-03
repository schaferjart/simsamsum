# Handsontable Filter Integration Feature

## Implementation Summary

Successfully implemented bidirectional filtering between Handsontable column filters and visualization filter rules with saveable filter sets.

## Features Implemented

### 1. Handsontable Column Filtering
- Enabled `filters` plugin in Handsontable base settings
- Added `dropdownMenu` with filter options: `filter_by_condition`, `filter_by_value`, `filter_action_bar`
- Works on both Elements and Connections tables

### 2. Bidirectional Sync
- Table filters automatically create filter rules in the controls panel
- `afterFilter` hook captures Handsontable filter changes
- `syncTableFiltersToRules()` converts filter conditions to rule format
- Auto-generated rules marked with `data-auto` attribute for tracking

### 3. Filter Rule Management
- Manual filter rules via UI (existing functionality)
- Auto-generated rules from table filters
- Rules display filter syntax: e.g., "incomingNumber > 100"
- Each rule can be styled with custom colors

### 4. Filter Sets (Save/Load)
- Save current filters + styling as named sets
- Stored in localStorage as `workflow-filter-sets`
- Load saved sets to restore configuration
- Delete unwanted sets
- UI controls in the Filters section:
  - **Save Set** button - prompts for name and saves
  - **Load Filter Set** dropdown - lists available sets
  - **Delete** button - removes selected set

### 5. Styling Integration
- Each filter rule can have associated styling
- Color picker for node/link colors
- Styling rules saved/loaded with filter sets
- Existing styling system preserved

## User Workflow

### Basic Filtering (Table-based)
1. Open Elements or Connections table
2. Click dropdown menu on any column header
3. Apply filter conditions (contains, equals, greater than, etc.)
4. Filter rules automatically appear in controls panel
5. Visualization updates with filtered/highlighted elements

### Creating Filter Sets
1. Apply filters via table columns or manual rules
2. Define styling for each rule (optional)
3. Click **Save Set** button
4. Enter a descriptive name (e.g., "High Volume Nodes")
5. Set saved to localStorage

### Loading Filter Sets
1. Select from **Load Filter Set** dropdown
2. All filters and styling automatically applied
3. Both table filters and visualization update

### Managing Filter Sets
- Sets persist across sessions (localStorage)
- Each set includes:
  - Filter rules with syntax
  - Styling rules with colors
  - Timestamp
- Delete via Delete button when set selected

## Technical Details

### New Functions (src/js/ui.js)
- `syncTableFiltersToRules(hot, scope, onChange)` - Converts table filters to rules
- `convertFilterToRule(scope, columnId, conditionName, args)` - Maps filter operators
- `addFilterRuleFromData(rule, onChange, autoScope)` - Creates rule UI from data
- `addStylingRuleFromData(rule, onChange)` - Creates styling rule UI from data
- `saveFilterSet(name)` - Persists filter set to localStorage
- `loadFilterSet(name)` - Restores filter set from localStorage
- `deleteFilterSet(name)` - Removes filter set
- `updateFilterSetDropdown()` - Updates dropdown options
- `initFilterSets()` - Loads sets on startup

### Operator Mapping
```javascript
{
  'contains': 'contains',
  'not_contains': 'not_contains',
  'eq': 'equals',
  'neq': 'not_equals',
  'gt': 'gt',
  'lt': 'lt',
  // Handsontable specific
  'begins_with': 'contains',
  'ends_with': 'contains',
  'by_value': 'equals'
}
```

### Data Structure
```javascript
_filterSets = {
  "setName": {
    filters: [
      { scope: 'node', column: 'incomingNumber', operator: 'gt', value: 100 }
    ],
    styling: [
      { scope: 'node', column: 'type', operator: 'equals', value: 'Action', color: '#ff6b6b' }
    ],
    timestamp: "2025-10-02T..."
  }
}
```

### HTML Changes (index.html)
Added filter set controls in Filters section:
```html
<div class="filter-set-controls">
  <select id="filterSetsSelect">...</select>
  <button id="saveFilterSetBtn">💾 Save Set</button>
  <button id="deleteFilterSetBtn">🗑️ Delete</button>
</div>
```

### Event Handlers
- Save Set: Prompts for name, calls `saveFilterSet()`
- Load dropdown: Calls `loadFilterSet()` on change
- Delete: Confirms and calls `deleteFilterSet()`

## Example Usage

### Scenario 1: Filter high-volume nodes
1. In Elements table, click "Incoming Number" column dropdown
2. Select "Greater than" filter
3. Enter "500"
4. Rule appears: "Incoming Number > 500"
5. Add color styling (e.g., red)
6. Save as "High Volume Nodes"

### Scenario 2: Filter by multiple criteria
1. Filter "Type" = "Action" in table
2. Manually add filter rule for "Platform" contains "Team Tailor"
3. Add styling: Actions = blue, Team Tailor = green
4. Save as "Team Tailor Actions"

### Scenario 3: Quick analysis
1. Load saved set "High Volume Nodes"
2. Visualization highlights matching nodes
3. Modify filters as needed
4. Save as new set or overwrite existing

## Benefits

1. **Speed**: Table column filtering faster than manual rule creation
2. **Visibility**: Filter syntax clearly shown in controls panel
3. **Reusability**: Save common filter configurations
4. **Flexibility**: Combine table filters with manual rules
5. **Styling**: Visual differentiation with custom colors
6. **Persistence**: Filter sets survive page reloads

## Files Modified

- `src/js/ui.js`: Added filter set management functions, Handsontable hooks
- `index.html`: Added filter set UI controls
- `.github/copilot-instructions.md`: Documented filter set feature

## Testing

Access at: http://localhost:5174 (or configured port)

Test cases:
1. Apply column filter → verify rule appears
2. Create multiple filters → verify all sync
3. Save filter set → verify localStorage
4. Reload page → verify sets load
5. Load filter set → verify filters apply
6. Delete filter set → verify removal
7. Apply styling → verify visual changes
