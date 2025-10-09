# Filter Set Duplication Fix

## Issue Description

When loading a filter set in the editor panel, styling information was displayed twice:
1. Once in the **Filters** section (with styling checkbox enabled showing colors/stroke widths)
2. Again in the **Styling Rules** section (duplicate styling rules)

This was caused by legacy code that saved styling information in two places without proper deduplication.

## Root Cause Analysis

### The Duplication Problem

Filter sets were storing styling information in **both** locations:

1. **Embedded in filter rules**: Each filter rule with styling had a `style` property
   ```json
   {
     "scope": "connection",
     "column": "source",
     "operator": "contains",
     "value": "MP",
     "style": {
       "color": "#60fb62",
       "strokeWidth": 3
     }
   }
   ```

2. **Duplicate in styling array**: The same styling was also saved as a separate styling rule
   ```json
   {
     "scope": "connection",
     "column": "source",
     "operator": "contains",
     "value": "MP",
     "color": "#60fb62",
     "strokeWidth": 3,
     "fromFilter": true
   }
   ```

### The Display Problem

When `applyFiltersAndStyles()` was called, it combined:
- `getDerivedStylingRules(filterRules)` - extracted styling from filter rules
- `getStylingRules()` - standalone styling rules from the UI

This meant filter-embedded styling was applied **twice**:
1. Once via `getDerivedStylingRules()` which extracts `style` properties from filters
2. Again from the `styling` array loaded from the filter set

## Solution Implemented

### Single Source of Truth

**Decision**: Filter rules with embedded styling are the primary source. The `styling` array should **only** contain truly standalone styling rules (those created in the "Styling Rules" section without corresponding filters).

### Changes Made

#### 1. Updated `saveFilterSet()` in `/src/js/ui/api-client.js`

Added logic to:
- **Filter out duplicates**: Check if a styling rule matches a filter rule with styling
- **Convert format**: Transform from nested structure to flat structure for storage
- **Save only standalone rules**: Exclude styling rules that duplicate filter-embedded styles

```javascript
const standaloneStyleRules = allStylingRules
    .filter(styleRule => {
        // Exclude styling rules that match filter rules with styling
        const isDuplicate = filters.some(filter => {
            return filter.style && 
                   filter.scope === styleRule.scope &&
                   filter.column === styleRule.condition?.column &&
                   filter.operator === styleRule.condition?.operator &&
                   String(filter.value) === String(styleRule.condition?.value);
        });
        return !isDuplicate;
    })
    .map(styleRule => {
        // Convert from nested to flat format
        const flattened = {
            scope: styleRule.scope,
            column: styleRule.condition?.column,
            operator: styleRule.condition?.operator,
            value: styleRule.condition?.value
        };
        
        if (styleRule.style?.color) {
            flattened.color = styleRule.style.color;
        }
        if (styleRule.style?.strokeWidth) {
            flattened.strokeWidth = styleRule.style.strokeWidth;
        }
        
        return flattened;
    });
```

#### 2. Cleaned Existing Filter Sets

Updated `/data/sets/pretty1.json` and `/data/sets/go-nogo.json` to remove duplicate styling arrays, leaving only empty arrays since all styling was embedded in filters.

**Before** (`pretty1.json`):
```json
{
  "filters": [...with embedded styles...],
  "styling": [
    ...4 duplicate rules, including one triple-duplicated...
  ]
}
```

**After** (`pretty1.json`):
```json
{
  "filters": [...with embedded styles...],
  "styling": []
}
```

## Expected Behavior

### When Saving a Filter Set

1. Filter rules with styling → saved with embedded `style` property
2. Standalone styling rules → saved in `styling` array
3. **No duplication**: Styling derived from filters is NOT added to `styling` array

### When Loading a Filter Set

1. Filters are loaded with their embedded styling → displayed in "Filters" section with styling controls visible
2. Only standalone styling rules are loaded → displayed in "Styling Rules" section
3. **Single display**: Each styling rule appears only once in the appropriate section

### During Visualization

The `applyFiltersAndStyles()` method still combines:
- `getDerivedStylingRules(filterRules)` - extracts styling from filters
- `getStylingRules()` - standalone rules

But now there's no duplication because the `styling` array only contains non-overlapping rules.

## Benefits

1. ✅ **No more visual duplication** in the editor panel
2. ✅ **Single source of truth** for filter-based styling
3. ✅ **Cleaner data files** without redundant information
4. ✅ **Proper separation** between filter-embedded and standalone styling
5. ✅ **Backward compatible** with the loading mechanism

## Testing

To verify the fix:

1. Load an existing filter set (e.g., "pretty1" or "go-nogo")
2. Check the "Filters" section → should show filters with styling controls enabled
3. Check the "Styling Rules" section → should NOT show duplicate rules
4. Create new filter with styling, save as new set
5. Reload the page and load the new set → verify no duplication

## Files Modified

- `/src/js/ui/api-client.js` - Updated `saveFilterSet()` function
- `/data/sets/pretty1.json` - Removed duplicate styling array
- `/data/sets/go-nogo.json` - Removed duplicate styling array

## Related Documentation

- [Filter Feature Documentation](./FILTER_FEATURE.md)
- [Refactoring Map](../refactor/REFACTORING_MAP.md)
