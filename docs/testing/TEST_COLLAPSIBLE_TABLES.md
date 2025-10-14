# Collapsible Tables Testing Guide

## Test Implementation

The collapsible tables feature has been implemented to match the control panel's collapsible groups behavior.

### What Was Changed:

1. **CSS Styling** (`src/style.css`):
   - Added chevron indicator (`›`) that rotates 90° when expanded, 0° when collapsed (matching control panel)
   - Header is now fully clickable with hover effect
   - Table controls (Columns and Maximize buttons) moved into collapsible content area
   - Vertical resizer is hidden when table is collapsed
   - Tables stack nicely with minimal spacing when collapsed

2. **JavaScript** (`src/js/ui/collapsible-tables.js`):
   - Restructures the table header to separate clickable title from controls
   - Moves table controls into the collapsible content wrapper
   - Entire header is clickable (matching control panel behavior)
   - State persists in localStorage under `workflow-collapsible-tables-state`
   - Keyboard accessible (Enter/Space to toggle)

3. **Integration** (`src/js/ui/handsontable-manager.js`):
   - Collapsible tables initialization called in `initUIInteractions()`

### Testing Checklist:

- [ ] Click on table header to collapse/expand
- [ ] Verify chevron rotates smoothly (90° expanded, 0° collapsed)
- [ ] Confirm table content (table, controls) disappears when collapsed
- [ ] Check that vertical resizer is hidden when table is collapsed
- [ ] Verify tables stack nicely without gaps when collapsed
- [ ] Test that state persists after page reload
- [ ] Ensure keyboard navigation works (Tab to header, Enter/Space to toggle)
- [ ] Verify Columns and Maximize buttons are only accessible when expanded
- [ ] Check that the look and feel matches the control panel collapsible groups

### Expected Behavior:

When you click on a table header (e.g., "Elements", "Connections", "Variables"):
1. The chevron should rotate from pointing right (›) to pointing down (when expanded)
2. The table content, column controls, and maximize button should smoothly fade out
3. The vertical resizer below should disappear
4. The table should take minimal vertical space
5. Other tables should shift up to fill the space
6. State should be saved to localStorage

### Similar to Control Panel:
- Same chevron style and rotation
- Same transition timing and easing
- Entire header is clickable
- Same visual feedback on hover
