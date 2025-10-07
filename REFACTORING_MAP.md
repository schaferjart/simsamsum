# Refactoring Map

This document outlines the refactoring of `src/js/ui.js` and `src/js/core.js` into smaller, more maintainable modules.

## Overview

The monolithic architecture was broken down into modular components:
- `src/js/ui.js` → `src/js/ui/` directory (8 modules)
- `src/js/core.js` → `src/js/core/` directory (5 modules)

The refactored code follows the **barrel pattern** where `src/js/ui/index.js` and `src/js/core.js` act as central export points, re-exporting all public APIs from their respective sub-modules.

---

## `src/js/ui.js` Refactoring

The monolithic `ui.js` file was broken down into a new `src/js/ui/` directory with 8 specialized modules.

### Module Structure

```
src/js/ui/
├── index.js              # Barrel file - re-exports all public APIs
├── dom-constants.js      # UI constants (columns, operators)
├── filter-ui.js          # Filter rule management
├── styling-ui.js         # Styling rule management
├── panel-manager.js      # Panel visibility and state
├── theme-manager.js      # Theme switching and color utilities
├── api-client.js         # Server API interactions for filter sets
└── handsontable-manager.js  # Data grid management
```

### Function Mapping

| Original Function | Description | New Location | Notes |
|---|---|---|---|
| **Constants & Configuration** |
| `NODE_COLUMNS` | Array defining node properties for filters/styling | `src/js/ui/dom-constants.js` | Exported constant |
| `CONNECTION_COLUMNS` | Array defining connection properties for filters/styling | `src/js/ui/dom-constants.js` | Exported constant |
| `OPERATORS` | Object mapping data types to filter operators | `src/js/ui/dom-constants.js` | Exported constant |
| `NUMERIC_NODE_COLUMNS` | Filtered array of numeric node columns | `src/js/ui/index.js` | Derived from `NODE_COLUMNS` |
| `DEFAULT_SIZE_COLUMN` | Default column for node sizing | `src/js/ui/index.js` | Constant set to `'incomingVolume'` |
| **Filter Management** |
| `addFilterRule` | Adds empty filter rule to UI | `src/js/ui/filter-ui.js` | For user interaction |
| `addFilterRuleFromData` | Adds filter rule from data object | `src/js/ui/filter-ui.js` | For loading saved filters |
| `getFilterRules` | Gathers all active filter rules | `src/js/ui/filter-ui.js` | Returns array of rule objects |
| `getFilterMode` | Gets filter mode ('highlight'/'exclude') | `src/js/ui/filter-ui.js` | Reads radio button state |
| **Styling Management** |
| `addStylingRule` | Adds empty styling rule to UI | `src/js/ui/styling-ui.js` | For user interaction |
| `addStylingRuleFromData` | Adds styling rule from data object | `src/js/ui/styling-ui.js` | For loading saved styles |
| `getStylingRules` | Gathers all active styling rules | `src/js/ui/styling-ui.js` | Returns array of rule objects |
| `getDerivedStylingRules` | Creates styles from filter rules | `src/js/ui/styling-ui.js` | Auto-generates from filters |
| **Panel Management** |
| `showNodeDetails` | Shows detail panel for selected node | `src/js/ui/panel-manager.js` | Updates DOM with node info |
| `hideDetailsPanel` | Hides the details/editor panel | `src/js/ui/panel-manager.js` | Toggles visibility |
| `toggleControlsPanel` | Toggles main controls panel | `src/js/ui/panel-manager.js` | Shows/hides controls |
| **Theme Management** |
| `toggleTheme` | Switches between light/dark themes | `src/js/ui/theme-manager.js` | Updates DOM classes |
| `initializeTheme` | Initializes theme from preferences | `src/js/ui/theme-manager.js` | Called on startup |
| `getThemeAppropriateColor` | Gets color for current theme | `src/js/ui/theme-manager.js` | Returns theme-aware color |
| **Filter Set API (Server Communication)** |
| `saveFilterSet` | Saves current filters/styles to server | `src/js/ui/api-client.js` | ✨ High-level wrapper |
| `loadFilterSet` | Loads filter set from server | `src/js/ui/api-client.js` | ✨ High-level wrapper |
| `deleteFilterSet` | Deletes filter set from server | `src/js/ui/api-client.js` | ✨ High-level wrapper |
| `populateFilterSetsDropdown` | Populates dropdown with available sets | `src/js/ui/api-client.js` | ✨ Called on init |
| `initializeApiClient` | Injects dependencies into API client | `src/js/ui/api-client.js` | ✨ Dependency injection |
| `fetchAllFilterSets` | Low-level API fetch all sets | `src/js/ui/api-client.js` | Internal use |
| `fetchFilterSet` | Low-level API fetch single set | `src/js/ui/api-client.js` | Internal use |
| `saveFilterSetData` | Low-level API save operation | `src/js/ui/api-client.js` | Internal use |
| `deleteFilterSetData` | Low-level API delete operation | `src/js/ui/api-client.js` | Internal use |
| **Data Grid (Handsontable)** |
| `initEditorTables` | Initializes Handsontable instances | `src/js/ui/handsontable-manager.js` | Creates node/connection grids |
| `refreshEditorData` | Refreshes grid data | `src/js/ui/handsontable-manager.js` | Updates from app state |
| `updateTableSelectionHighlights` | Highlights selected rows | `src/js/ui/handsontable-manager.js` | Syncs with graph selection |
| `updateElementComputedFields` | Updates calculated fields in grid | `src/js/ui/handsontable-manager.js` | Recalculates volumes/costs |
| `highlightTableRowByNodeId` | Highlights specific row on hover | `src/js/ui/handsontable-manager.js` | Visual feedback |
| `clearTableRowHoverHighlight` | Clears hover highlight | `src/js/ui/handsontable-manager.js` | Removes visual feedback |
| `showVariablesUI` | Shows variables editor | `src/js/ui/handsontable-manager.js` | Displays variable panel |
| **UI Orchestration (Remains in index.js)** |
| `bindEventListeners` | Binds all UI event listeners | `src/js/ui/index.js` | Main event binding |
| `populateLayoutsDropdown` | Populates layout dropdown | `src/js/ui/index.js` | Fetches from server |
| `toggleGridControls` | Shows/hides grid controls | `src/js/ui/index.js` | Controls visibility |
| `updateGridUI` | Updates grid button state | `src/js/ui/index.js` | Visual state update |
| `updateGridSizeLabel` | Updates grid size label | `src/js/ui/index.js` | Label text update |
| `resetUI` | Resets filters/controls to defaults | `src/js/ui/index.js` | Clears all rules |
| `updateSizeControlUI` | Updates node sizing controls | `src/js/ui/index.js` | Dropdown/toggle state |
| `getNumericNodeColumns` | Returns numeric columns array | `src/js/ui/index.js` | Helper for sizing |
| `getDefaultSizeColumn` | Returns default size column | `src/js/ui/index.js` | Helper for sizing |

### ✨ New Filter Set Features

The filter set functionality was **completely refactored and fixed** during this migration:

**Previous Issues:**
- Filter sets were not loading/displaying correctly
- Missing API wrapper functions
- No dropdown population on initialization
- Incorrect function signatures and parameter order

**Current Implementation:**
1. **Dependency Injection Pattern**: `initializeApiClient()` receives filter/styling functions
2. **Proper Function Signatures**: `addFilterRuleFromData(rule, onChange, autoScope)` and `addStylingRuleFromData(rule, onChange)`
3. **Auto-initialization**: `populateFilterSetsDropdown()` called during `bindEventListeners()`
4. **Complete API Layer**: High-level wrappers (`saveFilterSet`, `loadFilterSet`, `deleteFilterSet`) handle UI updates
5. **Server Integration**: Low-level functions communicate with `/api/filter-sets` endpoints

---

## `src/js/core.js` Refactoring

The `core.js` file was refactored into a new `src/js/core/` directory with 5 specialized modules. The main `WorkflowVisualizer` class was moved to `app.js`, and supporting functionality was extracted.

### Module Structure

```
src/js/core/
├── app.js                # WorkflowVisualizer class (main app logic)
├── data-loader.js        # Data loading/saving (JSON, localStorage)
├── undo-manager.js       # Undo/redo functionality
├── event-handler-factory.js  # Creates event handler objects
└── graph-transforms.js   # Graph transformation utilities
```

**Entry Point:** `src/js/core.js` now acts as a simple barrel file with `initializeApp()` function.

### Function/Method Mapping

| Original Function/Method | Description | New Location | Notes |
|---|---|---|---|
| **Main Application Class** |
| `WorkflowVisualizer` (class) | Main application orchestrator | `src/js/core/app.js` | Entire class moved |
| `constructor` | Initializes state and undo manager | `src/js/core/app.js` | Part of class |
| `init` | Sets up visualization, loads data | `src/js/core/app.js` | Async initialization |
| `initializeApp` | Creates and initializes app instance | `src/js/core.js` | ✨ New entry point |
| **Data Management** |
| `loadFromJsonFiles` | Loads workflow from JSON files | `src/js/core/data-loader.js` | Async function |
| `loadFromLocalStorage` | Loads from browser localStorage | `src/js/core/data-loader.js` | Fallback loading |
| `saveToLocalStorage` | Saves to browser localStorage | `src/js/core/data-loader.js` | Persistence function |
| **Undo/Redo System** |
| `UndoManager` (class) | Manages undo/redo stack | `src/js/core/undo-manager.js` | Extracted class |
| `_pushUndo` (method) | Pushes action to undo stack | `src/js/core/undo-manager.js` | Now `undoManager.push()` |
| `undoLastAction` (method) | Reverts last action | `src/js/core/app.js` | Calls `undoManager.pop()` |
| **Event Handling** |
| `getEventHandlers` (method) | Creates event handler object | `src/js/core/event-handler-factory.js` | Now `createEventHandlers(app)` |
| **Graph Transformations** |
| `rotateGraph` | Rotates graph by degrees | `src/js/core/graph-transforms.js` | Pure function |
| `flipGraph` | Flips graph horizontally/vertically | `src/js/core/graph-transforms.js` | Pure function |
| `centerGraph` | Centers and resets zoom | `src/js/core/graph-transforms.js` | Pure function |
| `fitToScreen` | Fits graph to viewport | `src/js/core/graph-transforms.js` | Pure function |

### Core Class Methods (Remaining in app.js)

The following methods remain as part of the `WorkflowVisualizer` class in `app.js`:

- **Visualization**: `updateVisualization()`, `refreshNodeSizing()`, `getProcessDataSizingConfig()`
- **Layout**: `handleLayoutChange()`, `updateLayout()`, `toggleGrid()`, `snapAllToGrid()`, `saveLayout()`, `loadLayout()`
- **Selection**: `clearSelection()`, `handleNodeClick()`, `handleNodeHover()`
- **Data Management**: `computeDerivedFields()`, `refreshTables()`, `initializeEmptyState()`
- **Filtering**: `applyFiltersAndStyles()`, `applyDynamicFilters()`, `applyDynamicStyles()`
- **Export**: `handleExport()`, `handleVerify()`
- **Interaction**: `handleReset()`, `handleResize()`, `handleSizeToggle()`, `handleSizeColumnChange()`

---

## Benefits of Refactoring

### Code Organization
- **Single Responsibility**: Each module has one clear purpose
- **Easier Navigation**: Functions are grouped logically
- **Better Discoverability**: Clear file names indicate contents

### Maintainability
- **Reduced Complexity**: Smaller files are easier to understand
- **Isolated Changes**: Modifications don't affect unrelated code
- **Better Testing**: Modules can be tested independently

### Performance
- **Tree Shaking**: Unused exports can be eliminated during bundling
- **Lazy Loading**: Modules can be loaded on demand (future enhancement)

### Developer Experience
- **Barrel Exports**: Clean import statements via `src/js/ui/index.js`
- **Type Safety**: Easier to add TypeScript definitions per module
- **Documentation**: Smaller scope makes documentation clearer

---

## Migration Notes

### Import Changes

**Before (monolithic):**
```javascript
import { addFilterRule, showNodeDetails, toggleTheme } from './ui.js';
import { WorkflowVisualizer } from './core.js';
```

**After (modular):**
```javascript
import { addFilterRule, showNodeDetails, toggleTheme } from './ui/index.js';
import { initializeApp } from './core.js';
// or direct imports:
import { addFilterRule } from './ui/filter-ui.js';
```

### Breaking Changes

1. **Filter Set Functions**: Function signatures changed for `addFilterRuleFromData` and `addStylingRuleFromData` - parameters now in correct order `(rule, onChange, autoScope?)`

2. **Undo Manager**: Changed from `app._pushUndo()` to `app.undoManager.push()`

3. **Event Handlers**: Changed from `app.getEventHandlers()` to `createEventHandlers(app)`

4. **App Initialization**: Changed from `new WorkflowVisualizer()` to `initializeApp()`

### Deprecated Functions

The following functions from the old `ui.js` were replaced:
- `initFilterSets()` → Replaced by `populateFilterSetsDropdown()` called in `bindEventListeners()`

---

## File Size Comparison

| Original | Lines | Refactored | Lines | Change |
|---|---|---|---|---|
| `src/js/ui.js` | ~2200 | `src/js/ui/*.js` (8 files) | ~1800 total | ⬇️ 18% reduction |
| `src/js/core.js` | ~1300 | `src/js/core/*.js` (5 files) | ~1100 total | ⬇️ 15% reduction |

*Note: Line count reduction includes removal of duplicate code and improved organization*

---

## Testing Checklist

After refactoring, verify:

- ✅ Filter rules can be added, edited, and removed
- ✅ Styling rules can be added, edited, and removed  
- ✅ Filter sets can be saved, loaded, and deleted
- ✅ Filter sets dropdown populates on startup
- ✅ Theme switching works correctly
- ✅ Node details panel displays correctly
- ✅ Handsontable grids initialize and sync with graph
- ✅ Graph transformations (rotate, flip, center, fit) work
- ✅ Undo/redo functionality works
- ✅ Layout switching and grid controls work
- ✅ Data loads from JSON files and localStorage
- ✅ Export and verify functions work

---

**Last Updated:** October 7, 2025  
**Refactoring Status:** ✅ Complete  
**Known Issues:** None
