# Bidirectional Selection & Filter Array Support

## Changes Made

### 1. Table → Visualization Selection Sync (FIXED v2)

**Problem:** Selecting rows in Handsontable Elements table highlighted ALL rows instead of just the selected ones.

**Root Causes:** 
1. Using `_nodesHot.getSelected()` which returns ALL selection layers, not just the current user selection
2. `afterSelectionEnd` firing during table initialization when Handsontable auto-selects first cell
3. `afterSelectionEnd` firing during filter operations

**Solutions:**
1. Changed to use only the current selection parameters (`row`, `row2`) passed to `afterSelectionEnd`
2. Added `_allowSelectionSync` flag that starts as `false` during initialization
3. Enable flag after 500ms delay once tables are fully initialized
4. Temporarily disable flag during `afterFilter` operations

```javascript
// Flag to prevent selection sync during initialization/programmatic operations
let _allowSelectionSync = false;

afterSelectionEnd: (row, column, row2, column2, selectionLayerLevel) => {
    if (!_allowSelectionSync) return; // Ignore during initialization
    if (!core || !core.selectionManager) return;
    if (selectionLayerLevel !== 0) return; // Ignore non-primary selections
    
    // Only get the current selection layer, not all selections
    const minRow = Math.min(row, row2);
    const maxRow = Math.max(row, row2);
    // ... convert to nodeIds and select
}

// After table initialization:
setTimeout(() => {
    _allowSelectionSync = true;
    console.log('✅ Table selection sync enabled');
}, 500);

// During filter operations:
afterFilter: () => {
    const wasAllowed = _allowSelectionSync;
    _allowSelectionSync = false;
    syncTableFiltersToRules(...);
    setTimeout(() => { _allowSelectionSync = wasAllowed; }, 100);
}
```

### 2. Selection Manager Change Handler Updates Visuals

**Problem:** When `selectionManager.selectMultiple()` was called from table selection, the visualization nodes didn't update their visual state.

**Solution:** Enhanced `setOnChange` callback in `src/js/core.js` to update both visualization and table highlights:

```javascript
this.selectionManager.setOnChange((beforeIds, afterIds) => {
    // Push selection change action if it actually changed
    this._pushUndo({
        type: 'selection',
        before: beforeIds,
        after: afterIds
    });
    
    // Update visualization and table highlights
    updateSelectionVisuals(this.state.g, this.selectionManager.selectedNodes);
    ui.updateTableSelectionHighlights(this.selectionManager.selectedNodes);
});
```

### 3. Multiple Filter Conditions Fix (AND/OR Logic)

**Problem:** When applying multiple filters (e.g., "Incoming Volume = 200" AND "Name IN [Application Review 2, Rejection 2]"), all nodes disappeared because the system was treating ALL rules as strict AND conditions.

**Expected Behavior:**
- Filters on **different columns** should use AND logic (must match all)
- Filters on the **same column** should use OR logic (match any)

**Example:**
- Filter 1: `incomingVolume = 200` 
- Filter 2: `Name IN ["Application Review 2", "Rejection 2"]`
- Result: Show nodes where `(incomingVolume = 200) AND (Name = "Application Review 2" OR Name = "Rejection 2")`

**Solution:** Updated both `applyExcludeMode()` and `applyHighlightMode()` in `src/js/filtering.js`:

```javascript
// Group rules by column - within a column use OR, between columns use AND
if (nodeRules.length > 0) {
    filteredNodes = nodes.filter(node => {
        // Group rules by column
        const rulesByColumn = {};
        nodeRules.forEach(rule => {
            if (!rulesByColumn[rule.column]) {
                rulesByColumn[rule.column] = [];
            }
            rulesByColumn[rule.column].push(rule);
        });
        
        // For each column, at least one rule must match (OR within column)
        // All columns must have a match (AND between columns)
        return Object.values(rulesByColumn).every(columnRules => 
            columnRules.some(rule => evaluateRule(node, rule))
        );
    });
}
```

### 4. Array Value Support in Filters

**Solution:** Updated `evaluateRule()` in `src/js/filtering.js` to handle array values:

```javascript
function evaluateRule(item, rule) {
    const itemValue = getProperty(item, rule.column);
    const ruleValue = rule.value;

    if (itemValue === undefined) {
        return false;
    }

    const itemStr = String(itemValue).toLowerCase();
    
    // Handle array of values (from dropdown filters)
    if (Array.isArray(ruleValue)) {
        // For 'equals' with array, check if item value is in the array
        if (rule.operator === 'equals') {
            return ruleValue.some(v => String(v).toLowerCase() === itemStr);
        }
        // For other operators with arrays, use first value
        const ruleStr = String(ruleValue[0]).toLowerCase();
        return evaluateSimpleRule(itemStr, itemValue, ruleStr, ruleValue[0], rule.operator);
    }
    
    const ruleStr = String(ruleValue).toLowerCase();
    return evaluateSimpleRule(itemStr, itemValue, ruleStr, ruleValue, rule.operator);
}
```

### 5. Display Array Values in Filter UI

**Problem:** Filter rules created from dropdown selections showed `[object Object]` or array toString output.

**Solution:** Updated `addFilterRuleFromData()` in `src/js/ui.js` to format array values:

```javascript
// Format value display - handle arrays from dropdown filters
const displayValue = Array.isArray(rule.value) 
    ? rule.value.join(', ') 
    : (rule.value || '');
```

## Behavior Now

### Visualization → Table (Already Working)
1. Click node(s) in visualization
2. Nodes turn blue/selected in visualization
3. Corresponding rows highlight in Elements table
4. Table scrolls to show selected row

### Table → Visualization (NOW WORKING)
1. Click row(s) in Elements table (single or multi-select)
2. Rows highlight in table
3. Corresponding nodes turn blue/selected in visualization
4. Selection state syncs both ways

### Dropdown Filters (NOW WORKING)
1. Click column header dropdown in Handsontable
2. Select multiple values (e.g., "Application Review 2", "Rejection 2")
3. Filter rule appears in control panel: `Name equals Application Review 2, Rejection 2`
4. Visualization shows matching nodes highlighted/filtered
5. "Hide non-matching" mode correctly shows only matching nodes

## Technical Details

**Selection Flow:**
```
Handsontable afterSelectionEnd 
  → core.selectionManager.selectMultiple(nodeIds)
    → SelectionManager.setOnChange callback
      → updateSelectionVisuals(g, selectedNodes)
      → ui.updateTableSelectionHighlights(selectedNodes)
```

**Filter Flow:**
```
Handsontable afterFilter 
  → syncTableFiltersToRules(hot, scope, onChange)
    → convertFilterToRule(scope, columnId, name, args) // args[0] may be array
      → addFilterRuleFromData(rule, onChange, scope)
        → onChange() → core.applyFiltersAndStyles()
          → filterData(nodes, links, rules, mode)
            → evaluateRule(item, rule) // handles array values
```

## Files Modified

1. `src/js/ui.js`:
   - Added `afterSelectionEnd` hook to Elements table
   - Updated `addFilterRuleFromData()` to display array values

2. `src/js/core.js`:
   - Enhanced `selectionManager.setOnChange()` callback

3. `src/js/filtering.js`:
   - Updated `evaluateRule()` to handle array values
   - Added `evaluateSimpleRule()` helper function
