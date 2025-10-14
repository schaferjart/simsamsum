# CSV Workflow Update - Variables & Folder Organization

## Changes Made

### 1. Added Variables Support
- **variables.json** is now included in the CSV export/import workflow
- Variables are exported as a simple key-value CSV format:
  ```csv
  key,value
  video_application->application_review_1,0.1
  incoming_volume,1000
  ```
- Variables are automatically converted between CSV array format and JSON object format

### 2. Organized CSV Files in Dedicated Folder
- CSV files are now exported to `data/csv/` instead of `data/` root
- This keeps the data folder cleaner and better organized
- Files exported:
  - `data/csv/elements.csv` (209 items)
  - `data/csv/connections.csv` (252 items)
  - `data/csv/variables.csv` (17 items)

### 3. Updated Git Ignore
- Changed from ignoring `data/*.csv` to ignoring `data/csv/` folder
- This prevents the entire CSV working directory from being tracked

### 4. Updated Documentation
- `docs/CSV_WORKFLOW.md` now includes:
  - Variables CSV format and usage
  - Updated file paths (data/csv/)
  - Example workflow for editing variables
  - Cleanup commands for new folder structure

## Usage

### Export (creates data/csv/ folder)
```bash
npm run export:csv
```

### Edit in Google Sheets/Excel
- Open files from `data/csv/` folder
- Make your changes
- Save back to `data/csv/` folder (keep filenames)

### Import (reads from data/csv/ folder)
```bash
npm run import:csv
```

## Verification

All tests pass:
- ✅ 209 elements exported/imported correctly
- ✅ 252 connections exported/imported correctly  
- ✅ 17 variables exported/imported correctly
- ✅ Round-trip conversion preserves all data types
- ✅ Validation ensures data integrity

## Clean Up Note

Old CSV files from `data/` root have been removed. CSV files are now only in `data/csv/` which is properly ignored by git.
