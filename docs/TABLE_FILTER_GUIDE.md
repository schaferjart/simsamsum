# Table-Based Filtering System - User Guide

## Overview
The filtering system allows you to filter and highlight elements in the visualization using table column filters. Filters created in the tables automatically appear as filter rules in the controls panel.

## How It Works

### 1. Apply Filters in Tables

**Step-by-Step:**
1. Open the **Elements** or **Connections** table in the Editor panel
2. Click the dropdown menu (▼) icon on any column header
3. Choose a filter condition:
   - **Filter by condition** - Select operators like "equals", "contains", "greater than"
   - **Filter by value** - Select from unique values in that column
4. Set your filter value
5. Click "OK"

**Example: Filter Elements by Type**
1. Click dropdown on "type" column
2. Select "Filter by value"
3. Check only "Resource" and "Action"
4. Click OK
5. Table shows only Resource and Action elements

### 2. Auto-Generated Filter Rules

When you apply a filter in the table:
- A filter rule **automatically appears** in the Controls Panel → Filters section
- The rule shows: `Node: type in Resource, Action` (or similar)
- It's labeled "Auto-generated from table filter"
- It has a blue left border to distinguish it from manual rules

**What Gets Synced:**
- ✅ Filter operator (equals, contains, greater than, etc.)
- ✅ Filter value
- ✅ Column name
- ✅ Scope (Node/Element or Connection)

### 3. Visualization Updates

The visualization automatically:
- **Highlights** matching elements (in "Highlight matching" mode)
- **Hides** non-matching elements (in "Hide non-matching" mode)

Toggle between modes using the radio buttons at the top of the Filters section.

### 4. Modify or Remove Filters

**Remove a Single Filter:**
- Click the "×" button on the filter rule in the Controls Panel
- OR: Clear the filter from the table column dropdown

**Clear All Filters:**
- In the table, click "Clear all filters" from the dropdown menu
- OR: Remove all filter rules from the Controls Panel

### 5. Save Filter Sets

Once you have filters configured:

1. Click **"Save Set"** button in the Filters section
2. Enter a name (e.g., "High Volume Nodes")
3. The filter configuration saves to your browser

**What Gets Saved:**
- All filter rules (manual + auto-generated)
- Styling rules (colors, stroke widths)
- Filter mode (highlight vs hide)

### 6. Load Saved Filter Sets

1. Click the **"Load Filter Set..."** dropdown
2. Select a saved set
3. All filters and styling are restored
4. Both table and visualization update

### 7. Delete Filter Sets

1. Select a filter set from the dropdown
2. Click the **"Delete"** button
3. Confirm deletion

## Filter Operators

### Available Operators

| Operator | Description | Example |
|----------|-------------|---------|
| **Equals** | Exact match | type = "Resource" |
| **Not equals** | Doesn't match | execution ≠ "Manual" |
| **Contains** | Text contains substring | name contains "pdf" |
| **Not contains** | Text doesn't contain | name not contains "test" |
| **Greater than** | Number/date comparison | incomingNumber > 100 |
| **Less than** | Number/date comparison | avgCost < 0.5 |
| **Between** | Range (inclusive) | avgCost between 0.1 - 0.5 |
| **In** | Matches any value in list | type in Resource, Action |
| **Empty** | Field is empty/null | description = (empty) |
| **Not empty** | Field has value | variable ≠ (empty) |

## Common Use Cases

### Filter by Element Type
1. Open Elements table
2. Filter "type" column → Filter by value
3. Select: Resource, Action, State (uncheck others)
4. See only those types in visualization

### Find High-Volume Elements
1. Open Elements table
2. Filter "incomingNumber" column → Filter by condition
3. Select "Greater than"
4. Enter: 100
5. See elements with >100 incoming items

### Filter Connections by Source
1. Open Connections table
2. Filter "fromId" column → Filter by value
3. Select specific element IDs
4. See only connections from those elements

### Complex Multi-Column Filters
1. Apply filter on "type" column (e.g., type = "Resource")
2. Apply filter on "execution" column (e.g., execution = "Automatic")
3. Both filters combine (AND logic)
4. See only Automatic Resources

## Tips & Tricks

### 🎯 Quick Search vs Filters
- **Search bar**: Temporary, instant filtering across all columns
- **Column filters**: Persistent, can be saved as filter sets, visible in controls panel

### 🎨 Add Styling to Auto-Filters
Auto-generated filter rules are read-only, but you can:
1. Note the filter criteria
2. Remove the auto-filter
3. Create a manual filter rule with same criteria
4. Add custom colors and styling

### 📊 Combine Table Filters with Manual Rules
- Use table filters for quick, column-specific filtering
- Add manual filter rules for complex conditions
- Both types work together

### 💾 Organize with Filter Sets
Create sets for common workflows:
- "Onboarding Flow" - All recruitment-related elements
- "High Cost" - Elements with avgCost > 1.0
- "Manual Steps" - execution = "Manual"

### 🔄 Reset Everything
To clear all filters and start fresh:
1. Click "Clear all filters" in each table
2. Or refresh the page (filters don't persist across reloads unless saved)

## Troubleshooting

### Filter not working?
- Check filter mode (Highlight vs Hide non-matching)
- Verify column has data (empty columns can't filter)
- Try clearing and reapplying the filter

### Auto-rule not appearing?
- The `afterFilter` hook should trigger automatically
- Check browser console for errors
- Try refreshing the page

### Can't delete auto-generated rule?
- Click the "×" button on the rule itself
- Or clear the filter from the table column

### Filter set not saving?
- Check browser localStorage is enabled
- Try a different browser if issues persist
- Filter sets are per-browser (not synced)

## Technical Details

### How Table Filters Sync

```
User applies filter in table
    ↓
Handsontable's afterFilter hook fires
    ↓
syncTableFiltersToRules() extracts conditions
    ↓
Creates filter rule UI element
    ↓
Marks as auto-generated (data-auto attribute)
    ↓
Triggers visualization update
```

### Filter Data Structure

Auto-generated filters are stored as:
```javascript
{
  scope: 'node',           // or 'connection'
  column: 'type',          // column ID
  operator: 'equals',      // filter operator
  value: 'Resource'        // filter value
}
```

### Persistence

- **Table filters**: NOT persistent (cleared on refresh)
- **Filter sets**: Persistent in localStorage
- **Manual filter rules**: Cleared on refresh (unless in saved set)

## Related Features

- **Search Bars** - Quick filtering within tables
- **Manual Filter Rules** - Add filters via Controls Panel
- **Styling Rules** - Custom colors for filtered elements
- **Column Toggle** - Show/hide columns in tables
