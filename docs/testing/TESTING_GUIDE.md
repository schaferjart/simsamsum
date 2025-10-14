# Testing Guide - Enhanced Export Options

## Quick Test Steps

### 1. Basic PDF Export Test
1. Open the application at http://localhost:5174/
2. Click the **"Export"** button in the controls panel
3. The export modal should open with the following options visible:
   - Export Format dropdown (PDF, SVG)
   - Page Size dropdown (A4, A3, A5, Letter, Legal, Tabloid, Custom)
   - Orientation dropdown (Landscape, Portrait)
   - "Show Export Frame on Canvas" checkbox
   - "Include Background Color" checkbox
4. Select **PDF** format and **A4** page size
5. Select **Landscape** orientation
6. Click **"Export"**
7. Verify the PDF downloads successfully

### 2. Export Frame Test
1. Click **"Export"** button again
2. Check the **"Show Export Frame on Canvas"** checkbox
3. You should see a green dashed rectangle appear on the visualization
4. The frame should show:
   - Label "Export Area" at the top
   - Page dimensions (e.g., "297 × 210 mm") at the bottom
5. Change orientation to **Portrait**
6. The frame should update to show the new aspect ratio
7. Change page size to **A3**
8. The frame should update to show larger dimensions

### 3. Custom Size Test
1. In the export modal, select **"Custom Size"** from Page Size dropdown
2. Two input fields should appear: Width and Height
3. Enter custom dimensions:
   - Width: 500 mm
   - Height: 300 mm
4. If export frame is enabled, it should update to show custom dimensions
5. Click **"Export"**
6. Verify the PDF downloads with custom page size

### 4. SVG Export Test
1. Open export modal
2. Change Export Format to **SVG**
3. Note that PDF options disappear (Page Size, Orientation)
4. Click **"Export"**
5. Verify SVG file downloads successfully

### 5. Settings Persistence Test
1. Open export modal
2. Configure settings:
   - Format: PDF
   - Page Size: A3
   - Orientation: Portrait
   - Show Frame: Checked
3. Close the modal (X button or click outside)
4. Refresh the page (F5)
5. Open export modal again
6. Verify all settings are preserved from step 2

### 6. File Size Comparison Test

#### Old Method (for reference):
- Typical 50-node workflow PDF: ~8.5 MB
- Quality: Pixelated when zoomed
- Text: Not selectable

#### New Method (what you should see):
1. Export a workflow with some nodes
2. Check the downloaded PDF file size - should be **< 1 MB** (typically 200-500 KB)
3. Open the PDF in a PDF viewer
4. Zoom in to 400% or more
5. Verify graphics remain **crisp and sharp** (not pixelated)
6. Try to **select text** in the PDF - it should be selectable

### 7. Multiple Format Test
Test all page formats to ensure they work.

### 8. Orientation Test
For each page format, test both orientations.

## Expected Behaviors

- Export frame appears and updates dynamically
- PDF options visible only for PDF, custom size only for Custom
- Settings persist via localStorage
- PDF files < 1 MB, vector graphics, selectable text

## Console Tests

See original file for snippet usage.

## Edge Cases

- Very large graphs
- Empty visualization
- Custom size limits
- Rapid setting changes

## Regression Checklist

- Layouts, dragging, zoom/pan, filters, table editing, save/load, theme toggle

## Final Checklist

- All tests pass
- No console errors
- Documentation complete
