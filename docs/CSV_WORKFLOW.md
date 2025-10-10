# CSV Workflow for Editing Workflow Data

This guide explains how to edit elements and connections using CSV files in Google Sheets or Excel for better performance.

## Why Use CSV?

- **Better Performance**: Editing large JSON files in browser tables can be slow
- **Familiar Tools**: Use Excel, Google Sheets, or LibreOffice
- **Bulk Operations**: Easy find/replace, formulas, sorting
- **Lightweight**: CSV files load faster than JSON in spreadsheet apps

## Complete Workflow

### 1. Export JSON to CSV

```bash
npm run export:csv
```

This creates CSV files in `data/csv/`:
- `data/csv/elements.csv` - All workflow elements
- `data/csv/connections.csv` - All connections
- `data/csv/variables.csv` - All workflow variables

**Note**: CSV files are temporary (ignored by git). JSON remains the source of truth.

### 2. Edit in Google Sheets/Excel

#### Option A: Google Sheets
1. Go to Google Sheets
2. File → Import → Upload → Select a CSV file from `data/csv/`
3. Import settings:
   - Separator type: Comma
   - Convert text to numbers: **NO** (important!)
4. Make your edits
5. File → Download → Comma-separated values (.csv)
6. Save back to `data/csv/` folder (keep original filename)

#### Option B: Excel/LibreOffice
1. Open a CSV file from `data/csv/` in Excel
2. Make your edits
3. Save as CSV (not Excel format!)
4. Save back to `data/csv/` folder (keep original filename)

### 3. Import CSV back to JSON

```bash
npm run import:csv
```

This will:
- ✅ Validate all data (IDs, references, required fields)
- 💾 Create backup of existing JSON (timestamped)
- 📝 Update `elements.json` and `connections.json`
- 🔍 Report any errors

### 4. Verify Changes

```bash
npm run test:data
```

### 5. See Changes in App

Reload your browser (the app reads from JSON files)

## Important Rules

### When Editing Elements CSV

**Required columns**:
- `id` - Must be unique
- `name` - Display name

**Don't change**:
- Column names (first row)
- `id` values of existing elements (breaks connections)

**Safe to edit**:
- `name`, `type`, `subType`, `execution`, `platform`
- All cost/volume fields
- Any description fields

### When Editing Connections CSV

**Required columns**:
- `id` - Must be unique
- `fromId` - Must match an element id
- `toId` - Must match an element id

**Don't**:
- Reference non-existent element IDs (validation will catch this)

### When Editing Variables CSV

**Required columns**:
- `key` - Variable name (must be unique)
- `value` - Variable value (number or expression)

**Format**:
- Variables are stored as key-value pairs
- Keys are typically connection IDs (e.g., `element1->element2`)
- Values can be numbers (0.1, 0.5) or expressions

## Example: Adding 10 New Elements

1. Export: `npm run export:csv`
2. Open `data/csv/elements.csv` in Google Sheets
3. Copy last row 10 times
4. Update `id` and `name` columns:
   - `nc_info_pdf_13`, `NC Info PDF 13`
   - `nc_info_pdf_14`, `NC Info PDF 14`
   - ... etc
5. Download as CSV to `data/csv/elements.csv`
6. Import: `npm run import:csv`
7. Verify: `npm run test:data`

## Example: Bulk Update Platform Field

1. Export to CSV
2. In Google Sheets:
   - Open `data/csv/elements.csv`
   - Select `platform` column
   - Find & Replace: "Slack" → "Microsoft Teams"
3. Download as CSV to `data/csv/elements.csv`
4. Import back
5. Reload app

## Example: Update Variable Values

1. Export: `npm run export:csv`
2. Open `data/csv/variables.csv` in Google Sheets
3. Update values in the `value` column
4. Download as CSV to `data/csv/variables.csv`
5. Import: `npm run import:csv`

## Troubleshooting

### Import fails with "Row X has Y values but expected Z"
- Google Sheets may have added extra commas
- Check for blank rows at the end
- Ensure no columns were accidentally added/removed

### Numbers becoming text (e.g., "0.3" instead of 0.3)
- This is OK - import script converts them back
- Use "Convert text to numbers: NO" when importing to Google Sheets

### Connection errors: "fromId 'xxx' not found"
- You edited an element's `id` in elements.csv
- Fix: either restore the old ID or update connections.csv to use new ID

### "Duplicate id" errors
- CSV has duplicate rows
- Check for copy/paste mistakes
- Use spreadsheet's "Remove duplicates" feature

## Clean Up

CSV files are temporary. After importing, you can:

```bash
# Delete entire CSV folder
rm -rf data/csv

# Or keep files for next edit cycle (they'll be overwritten on next export)
```

Backup JSON files (created during import) can be deleted after verifying changes:

```bash
rm data/*.backup.*.json
```

## Advanced: Splitting Large Files

If even CSV is slow (500+ elements):

```bash
# Export only specific weeks
node -e "const fs=require('fs');const el=JSON.parse(fs.readFileSync('./data/elements.json','utf8'));const w2=el.filter(e=>e.id.startsWith('w2'));console.log('W2 elements:',w2.length);const csv=[Object.keys(w2[0]).join(','),...w2.map(e=>Object.values(e).map(v=>JSON.stringify(v||'')).join(','))].join('\n');fs.writeFileSync('./data/week2.csv',csv);"
```

Edit only `week2.csv`, then merge back manually or create a custom import script.
