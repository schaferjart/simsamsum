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
Test all page formats to ensure they work:

| Format | Size | Test Result |
|--------|------|-------------|
| A4 | 210 × 297 mm | ☐ Pass |
| A3 | 297 × 420 mm | ☐ Pass |
| A5 | 148 × 210 mm | ☐ Pass |
| Letter | 216 × 279 mm | ☐ Pass |
| Legal | 216 × 356 mm | ☐ Pass |
| Tabloid | 279 × 432 mm | ☐ Pass |
| Custom (e.g., 500×300) | User-defined | ☐ Pass |

### 8. Orientation Test
For each page format, test both orientations:

| Format | Landscape | Portrait |
|--------|-----------|----------|
| A4 | ☐ | ☐ |
| A3 | ☐ | ☐ |
| Letter | ☐ | ☐ |

## Expected Behaviors

### Export Frame
- **Appears**: When "Show Export Frame" is checked and format is PDF
- **Updates**: Dynamically when page size or orientation changes
- **Scales**: Automatically fits within the visualization area
- **Aspect Ratio**: Matches selected page format exactly
- **Position**: Centered on the canvas

### Export Modal
- **Opens**: When "Export" button is clicked
- **Closes**: When X button clicked, outside click, or after export
- **PDF Options**: Visible only when PDF format selected
- **Custom Size**: Visible only when "Custom Size" page format selected

### Settings
- **Saved**: Automatically to localStorage on every change
- **Restored**: Automatically when modal opens
- **Persists**: Across page refreshes and browser sessions

### Export Output
- **PDF Files**:
  - Extension: `.pdf`
  - Naming: `workflow-visualization-YYYYMMDDTHHMMSS.pdf`
  - Size: < 1 MB for typical workflows
  - Quality: Vector graphics (crisp at any zoom)
  - Text: Selectable and searchable
  
- **SVG Files**:
  - Extension: `.svg`
  - Naming: `workflow-visualization-YYYYMMDDTHHMMSS.svg`
  - Size: < 500 KB for typical workflows
  - Quality: Vector graphics
  - Compatibility: Opens in browsers and vector editors

## Browser Console Tests

### Automated Test Suite
Run this in the browser console:
```javascript
// Load the test file
fetch('/tests/test-export-functionality.js')
  .then(r => r.text())
  .then(code => eval(code));
```

### Manual Console Checks
```javascript
// Check if export settings manager is loaded
console.log(typeof window.getExportSettings);

// Check if svg2pdf is loaded
import('svg2pdf.js').then(() => console.log('✓ svg2pdf.js loaded'));

// Check export modal exists
console.log('Modal exists:', !!document.getElementById('exportModal'));

// Check export button exists
console.log('Button exists:', !!document.getElementById('exportBtn'));
```

## Known Edge Cases to Test

### 1. Very Large Graphs
- Create a workflow with 100+ nodes
- Export to PDF
- Verify it completes without errors (may take 2-3 seconds)

### 2. Empty Visualization
- Clear all nodes
- Try to export
- Should show error: "No visualization to export"

### 3. Custom Size Limits
- Try entering width/height < 50mm
- Should be clamped to minimum 50mm
- Try entering width/height > 2000mm
- Should be clamped to maximum 2000mm

### 4. Rapid Setting Changes
- Open export modal
- Quickly change page size multiple times
- Export frame should update smoothly without flickering

## Troubleshooting Common Issues

### Issue: Export modal doesn't open
**Check**: 
- Browser console for JavaScript errors
- Export button exists and is clickable
- Modal element exists in DOM

### Issue: Export frame doesn't appear
**Check**:
- "Show Export Frame" checkbox is checked
- Export format is set to PDF (frame only shows for PDF)
- Canvas/SVG element exists

### Issue: PDF export fails
**Check**:
- Browser console for errors
- SVG element exists in the visualization
- svg2pdf.js library loaded successfully

### Issue: Settings don't persist
**Check**:
- localStorage is enabled in browser
- No browser extensions blocking localStorage
- Console for localStorage errors

## Success Criteria

✅ All tests pass  
✅ No console errors  
✅ PDF files are < 1 MB  
✅ PDF graphics are crisp when zoomed  
✅ Text in PDF is selectable  
✅ Export frame displays correctly  
✅ Settings persist after page refresh  
✅ All page formats work  
✅ Both orientations work  
✅ Custom sizes work within limits  
✅ SVG export works  

## Performance Benchmarks

Measure and compare:

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Export time (50 nodes) | < 2 seconds | ___ | ☐ |
| PDF file size (50 nodes) | < 500 KB | ___ | ☐ |
| Export time (100 nodes) | < 3 seconds | ___ | ☐ |
| PDF file size (100 nodes) | < 1 MB | ___ | ☐ |
| Modal open time | < 100ms | ___ | ☐ |
| Frame update time | < 50ms | ___ | ☐ |

## Regression Testing

Ensure existing functionality still works:

- [ ] Force layout still works
- [ ] Manual grid layout still works
- [ ] Node dragging still works
- [ ] Multi-select still works
- [ ] Zoom/pan still works
- [ ] Filter functionality still works
- [ ] Table editing still works
- [ ] Save/load layouts still works
- [ ] Theme toggle still works

## Final Checklist

Before marking complete:

- [ ] All basic tests pass
- [ ] All page formats tested
- [ ] Export frame works correctly
- [ ] Settings persist properly
- [ ] File sizes are reasonable
- [ ] PDF quality is excellent
- [ ] No console errors
- [ ] No browser warnings
- [ ] Documentation is complete
- [ ] Code is well-commented
- [ ] Ready for code review

---

**Testing Date**: _________________  
**Tester**: _________________  
**Browser**: _________________  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________
