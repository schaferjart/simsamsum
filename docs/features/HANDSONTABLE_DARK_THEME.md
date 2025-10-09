# Handsontable Dark Theme Support

## Overview
This document describes the implementation of dark theme support for Handsontable tables in the application.

## Problem
Handsontable 14.3.0 does not include native dark mode support. The library ships with a light-themed stylesheet that doesn't adapt to dark mode preferences, resulting in poor contrast and readability when the application is set to dark mode.

## Solution
Custom CSS overrides that apply dark theme colors to Handsontable components when `[data-theme="dark"]` is active on the document root.

## Implementation

### Files Created
- **`src/styles/handsontable-theme.css`** - Comprehensive dark theme overrides for all Handsontable components

### Files Modified
- **`index.html`** - Added link to the new Handsontable theme stylesheet
- **`src/style.css`** - Removed duplicate Handsontable custom selection styles (moved to theme file)

### Architecture

The dark theme uses CSS attribute selectors to apply styling conditionally:

```css
[data-theme="dark"] .handsontable {
  background-color: var(--color-surface);
  color: var(--color-text);
}
```

This approach:
1. ✅ Automatically syncs with the application's theme system
2. ✅ Uses existing CSS variables for consistency
3. ✅ Requires no JavaScript changes
4. ✅ Works immediately when theme is toggled
5. ✅ Maintains all Handsontable functionality

### Components Styled

The dark theme override includes styling for:

#### Core Table Elements
- Table background and borders
- Cell backgrounds and text colors
- Header cells (column and row headers)
- Striped row backgrounds
- Border colors

#### Interactive States
- Active/current cell highlighting
- Cell selection ranges (area-1 through area-7)
- Row/column highlighting
- Hover states
- Read-only cell dimming

#### UI Components
- Context menus
- Dropdown menus
- Filter UI (inputs, selects, buttons)
- Autocomplete editor
- Cell input editor
- Comments
- Column sorting indicators

#### Visual Feedback
- Invalid cell highlighting
- Placeholder text
- Checkbox renderers
- Fill handle (drag-to-copy)
- Column resize handles
- Scrollbars

#### Custom Selection Highlights
- Yellow highlight for selected rows (`.is-selected`)
- Yellow highlight for hovered rows (`.is-hovered`)
- Adjusted opacity for dark mode visibility

## Color Mapping

The dark theme uses the application's CSS variables:

| Element | Light Theme | Dark Theme Variable |
|---------|-------------|-------------------|
| Background | `#fff` | `var(--color-surface)` |
| Text | `#000` | `var(--color-text)` |
| Borders | `#CCCCCC` | `var(--color-border)` |
| Headers | `#f5f5f5` | `var(--color-background)` |
| Selection | `rgba(0,0,255,0.1)` | `rgba(59,130,246,0.15)` |
| Hover | `#f0f0f0` | `var(--color-hover)` |
| Disabled | `#999` | `var(--color-text-muted)` |

## Theme Toggle Behavior

When the user toggles the theme using the theme button or `Ctrl+D`:

1. JavaScript updates `document.documentElement.setAttribute('data-theme', 'dark')`
2. CSS selectors `[data-theme="dark"] .handsontable` immediately activate
3. All visible Handsontable instances update instantly (no refresh needed)
4. Theme preference is saved to `localStorage`
5. Next page load restores the saved theme

## Testing

### Manual Testing Checklist
- [x] Toggle theme and verify table background changes
- [x] Check cell backgrounds in both themes
- [x] Verify header styling in dark mode
- [x] Test cell selection visibility
- [x] Check dropdown menus in dark mode
- [x] Verify context menu styling
- [x] Test filter UI visibility
- [x] Check read-only cell appearance
- [x] Verify custom yellow selection highlights
- [x] Test scrollbar appearance

### Browser Compatibility
The solution uses standard CSS attribute selectors and CSS variables, which are supported in:
- ✅ Chrome/Edge 88+
- ✅ Firefox 78+
- ✅ Safari 14+

## Future Enhancements

Potential improvements:
1. Add smooth transitions when toggling themes
2. Create additional theme variants (high contrast, etc.)
3. Support for system theme preferences via `prefers-color-scheme`
4. Custom color schemes for different user roles

## Related Files
- `/src/js/ui/theme-manager.js` - Theme toggle logic
- `/src/styles/base.css` - Application theme variables
- `/src/js/ui/handsontable-manager.js` - Table initialization

## References
- Handsontable Documentation: https://handsontable.com/docs/
- CSS Variables: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- Attribute Selectors: https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors
