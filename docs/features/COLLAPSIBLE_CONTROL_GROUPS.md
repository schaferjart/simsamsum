# Collapsible Control Groups Feature

## Overview

Added collapsible/expandable functionality to all control panel sections in the editor panel. Users can now click on section headers to collapse or expand them, with their preferences automatically saved and restored across sessions.

## User Experience

### How It Works

1. **Click to Toggle**: Click on any control group header to expand/collapse that section
2. **Visual Feedback**: 
   - Arrow indicator rotates 90° when collapsed
   - Smooth animation transitions
   - Hover effect on headers
3. **Persistent State**: Collapse preferences are saved to localStorage and restored on page reload
4. **Keyboard Accessible**: Press Enter or Space on a focused header to toggle

### Affected Sections

All control groups in the editor panel now have collapsible functionality:

1. **Filters** - Filter rules and filter set management
2. **Styling Rules** - Dynamic styling rules
3. **Element Size** - Node sizing controls
4. **Graph Layout** - Layout selection
5. **Manual Layout Settings** - Grid controls (when visible)
6. **Orientation Controls** - Rotation and flip controls

## Implementation Details

### Architecture

The feature is implemented with a modular approach:

- **CSS**: `/src/styles/layout.css` - Visual styling and transitions
- **JavaScript**: `/src/js/ui/collapsible-controls.js` - Core functionality
- **Integration**: `/src/js/ui/index.js` - Initialization during app startup

### Auto-Wrapping Strategy

Rather than requiring manual HTML changes, the JavaScript automatically wraps existing control groups:

1. **Finds** all `.control-group` elements
2. **Extracts** the existing label text
3. **Creates** a clickable header with title and toggle arrow
4. **Wraps** remaining content in a collapsible container
5. **Restores** saved state from localStorage

This approach:
- ✅ Requires zero HTML changes
- ✅ Works with existing markup
- ✅ Automatically handles new sections
- ✅ Maintains semantic structure

### CSS Structure

```css
.control-group {
  /* Bordered card appearance */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  padding: var(--space-12);
}

.control-group__header {
  /* Clickable header */
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.control-group__toggle {
  /* Arrow indicator */
  transition: transform 250ms;
}

.control-group--collapsed .control-group__toggle {
  /* Rotates when collapsed */
  transform: rotate(-90deg);
}

.control-group__content {
  /* Animated content wrapper */
  max-height: 2000px;
  transition: max-height 250ms, opacity 250ms;
}

.control-group--collapsed .control-group__content {
  /* Hides when collapsed */
  max-height: 0;
  opacity: 0;
}
```

### JavaScript API

The `collapsible-controls.js` module exports three functions:

#### `initializeCollapsibleControls()`

Initializes collapsible functionality for all control groups.

**Called**: During app initialization in `bindEventListeners()`

**Process**:
1. Queries all `.control-group` elements
2. Generates unique section IDs
3. Wraps content in proper structure
4. Restores saved state from localStorage
5. Attaches click and keyboard event handlers

#### `expandAll()`

Expands all control groups and saves state.

**Usage**: Could be called from a global "Expand All" button

```javascript
import { expandAll } from './ui/collapsible-controls.js';
expandAll();
```

#### `collapseAll()`

Collapses all control groups and saves state.

**Usage**: Could be called from a global "Collapse All" button

```javascript
import { collapseAll } from './ui/collapsible-controls.js';
collapseAll();
```

### LocalStorage Persistence

**Storage Key**: `workflow-collapsible-state`

**Format**:
```json
{
  "filters": false,
  "styling-rules": true,
  "element-size": false,
  "graph-layout": false,
  "gridcontrols": true,
  "orientation-controls": false
}
```

**Section ID Generation**:
- Uses `element.id` if available
- Falls back to label text converted to kebab-case
- Final fallback: `section-{index}`

### Accessibility Features

- ✅ **ARIA attributes**: `role="button"`, `aria-expanded`, `tabindex="0"`
- ✅ **Keyboard navigation**: Enter and Space keys toggle sections
- ✅ **Visual focus indicators**: Focus ring on keyboard navigation
- ✅ **Semantic structure**: Headers use `<h3>` for proper hierarchy
- ✅ **Screen reader support**: State changes announced via `aria-expanded`

## Benefits

1. **Cleaner Interface**: Users can collapse sections they don't need
2. **Reduced Scrolling**: Especially helpful for users focused on specific workflows
3. **Personalization**: Each user's preferences are saved
4. **Performance**: No impact on app performance (pure CSS transitions)
5. **Maintainability**: Auto-wrapping means no HTML changes needed for new sections

## Future Enhancements

Potential improvements for future iterations:

1. **Global Controls**: Add "Expand All" / "Collapse All" buttons in the header
2. **Tooltips**: Show section content preview on hover when collapsed
3. **Animation Options**: User preference for reduced motion
4. **Quick Access**: Keyboard shortcuts to toggle specific sections
5. **Responsive**: Auto-collapse less-used sections on smaller screens

## Testing

### Manual Testing Steps

1. **Basic Toggle**:
   - Click on "Filters" header → section should collapse
   - Click again → section should expand
   - Arrow should rotate appropriately

2. **Persistence**:
   - Collapse "Styling Rules" section
   - Refresh the page
   - Section should remain collapsed

3. **Multiple Sections**:
   - Collapse several sections
   - Expand others
   - Verify each maintains independent state

4. **Keyboard Navigation**:
   - Tab to a section header
   - Press Enter → section should toggle
   - Tab to next header and press Space → should toggle

5. **Visual Polish**:
   - Hover over headers → should show hover effect
   - Transitions should be smooth (250ms)
   - No content jumping or layout shifts

### Browser Compatibility

Tested and working in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

Uses standard CSS and JavaScript features with no dependencies.

## Files Modified

### New Files
- `/src/js/ui/collapsible-controls.js` - Core functionality

### Modified Files
- `/src/styles/layout.css` - Added collapsible styles
- `/src/styles/base.css` - Added `--color-bg-hover` variable
- `/src/js/ui/index.js` - Added imports and initialization call

## Related Features

- **Panel Toggle**: Existing Ctrl+B shortcut to hide/show entire controls panel
- **Theme Toggle**: Collapsible styles adapt to light/dark theme
- **Filter Sets**: Collapsible "Filters" section contains filter set management

## Code Examples

### Adding a New Control Group

New control groups automatically get collapsible functionality:

```html
<div class="control-group">
    <label class="form-label">My New Section</label>
    <!-- Your content here -->
    <button>Some Button</button>
    <input type="text" />
</div>
```

On initialization, this becomes:

```html
<div class="control-group">
    <div class="control-group__header" role="button" tabindex="0" aria-expanded="true">
        <h3 class="control-group__title">My New Section</h3>
        <span class="control-group__toggle" aria-hidden="true"></span>
    </div>
    <div class="control-group__content">
        <button>Some Button</button>
        <input type="text" />
    </div>
</div>
```

### Programmatic Control

```javascript
// Collapse a specific section (not yet implemented, but could be added)
function collapseSection(sectionId) {
    const section = document.querySelector(\`.control-group[data-section-id="\${sectionId}"]\`);
    if (section && !section.classList.contains('control-group--collapsed')) {
        section.querySelector('.control-group__header').click();
    }
}
```

## Performance Considerations

- **CSS Transitions**: Uses GPU-accelerated properties (transform, opacity)
- **LocalStorage**: Small JSON object, minimal storage impact
- **Event Listeners**: Efficient event delegation, one listener per section
- **No Reflows**: Max-height transition doesn't trigger expensive reflows
- **Minimal JS**: Most work done via CSS classes

## Known Limitations

1. **Max Height**: Content wrapper uses `max-height: 2000px` - extremely tall sections might clip
   - **Solution**: Increase max-height or use height: auto with JavaScript measurement
2. **No Transition Cancellation**: Quickly toggling might queue animations
   - **Minor Issue**: Unlikely to affect normal usage

## Conclusion

The collapsible control groups feature enhances the user experience by:
- Providing a cleaner, more organized interface
- Allowing users to focus on relevant controls
- Persisting user preferences across sessions
- Maintaining full accessibility standards

The implementation is robust, maintainable, and requires no ongoing HTML maintenance as new control groups are added to the application.
