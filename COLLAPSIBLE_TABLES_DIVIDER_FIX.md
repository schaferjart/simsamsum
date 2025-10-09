# Collapsible Tables - Divider Removal Fix

## Issue
After implementing collapsible tables, there were still visible dividers (borders) between collapsed tables when stacked.

## Root Cause
The `.table-header` element had a `border-bottom: 1px solid var(--color-border);` that was still visible even when the table was collapsed, creating unwanted divider lines between stacked collapsed tables.

## Solution
Added a CSS rule to remove the bottom border from collapsed table headers:

```css
.table-container.collapsed .table-header {
    border-bottom: none;
}
```

## Result
- ✅ Collapsed tables now stack cleanly without any divider lines
- ✅ Headers appear as continuous stacked items
- ✅ Matches the control panel collapsible groups behavior exactly
- ✅ No visual artifacts or borders between collapsed tables

## Files Modified
- `/workspaces/simsamsum/src/style.css` - Added border removal rule for collapsed headers

## Visual Comparison

**Before Fix:**
```
┌─────────────────┐
│   Elements     ›│
├─────────────────┤ ← unwanted divider
│  Connections   ›│
├─────────────────┤ ← unwanted divider
│   Variables    ›│
└─────────────────┘
```

**After Fix:**
```
┌─────────────────┐
│   Elements     ›│
│  Connections   ›│
│   Variables    ›│
└─────────────────┘
```

Clean, seamless stacking with no dividers! 🎉
