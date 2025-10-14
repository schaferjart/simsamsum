# Table Search Feature Implementation

## Summary
Added search bars to all three tables (Elements, Connections, Variables) that allow users to filter rows by searching across all columns.

## Changes Made

### 1. HTML Structure (`index.html`)
Added search input elements to each table section:
- `#elements-search` - Search bar for Elements table
- `#connections-search` - Search bar for Connections table  
- `#variables-search` - Search bar for Variables table

Each search bar is placed between the table header and the table content.

### 2. CSS Styling (`src/style.css`)
Added styles for search bars:
- `.table-search` - Container styling with padding and border
- `.table-search-input` - Input field styling with:
  - Full width layout
  - Consistent padding and border
  - Focus state with primary color highlight
  - Placeholder text styling
- Hides search bars when tables are collapsed

### 3. Search Functionality (`src/js/ui/table-search.js`)
Created new module with:
- `initTableSearch()` - Initialize search for a table instance
- `performSearch()` - Execute search and filter rows
- `clearTableSearch()` - Clear search for specific table
- `clearAllTableSearches()` - Clear all searches
- `getSearchTerm()` - Get current search term

**Features:**
- Real-time search with 200ms debounce
- Case-insensitive matching
- Searches across all columns and cells
- Uses Handsontable's `hiddenRows` plugin for filtering
- Press Escape to clear search
- Preserves table state when search is cleared

### 4. Integration (`src/js/ui/handsontable-manager.js`)
- Imported table-search module
- Enabled `hiddenRows: true` plugin in Handsontable base settings
- Initialized search for all three tables after table creation

## Usage

1. **Search**: Type in the search box above any table
2. **Clear**: Press Escape or delete all text
3. **Live Filtering**: Rows automatically hide/show as you type
4. **Search Scope**: Searches all visible columns and all cell values

## Technical Details

- **Debouncing**: 200ms delay prevents performance issues during typing
- **Row Hiding**: Uses Handsontable's `hiddenRows` plugin for efficient filtering
- **Case Insensitive**: All searches are lowercased for comparison
- **Column Agnostic**: Searches across all columns simultaneously
- **State Preservation**: Search state is maintained when tables are collapsed/expanded

## Testing

Test the search by:
1. Start the dev server: `npm run dev`
2. Open the application in browser
3. Navigate to any table in the Editor panel
4. Type in the search box (e.g., "indeed", "pdf", "0.5")
5. Verify rows are filtered in real-time
6. Press Escape to clear and restore all rows
