# Quick Test Guide - Export Frame Enhancements

## How to Test the New Features

### Test 1: Draggable Export Frame (30 seconds)

1. Open the app at http://localhost:5174/
2. Click the **"Export"** button
3. Check **"Show Export Frame on Canvas"**
4. **Click and drag** the green frame to move it around
5. ✅ Frame should move smoothly
6. ✅ Frame should stay within the canvas boundaries
7. ✅ Cursor should show "move" icon

**Expected Result**: Frame moves wherever you drag it, but can't go outside the canvas.

---

### Test 2: Resize from Corners (30 seconds)

1. With the frame visible, find the **4 corner handles** (green circles)
2. **Hover** over a corner handle
3. ✅ Handle should scale up and cursor should change (e.g., nw-resize)
4. **Click and drag** a corner handle
5. ✅ Frame should resize
6. ✅ Aspect ratio should be maintained
7. ✅ Dimensions should update in real-time

**Expected Result**: Frame resizes from corner, keeps aspect ratio, shows updated dimensions.

---

### Test 3: Resize from Edges (30 seconds)

1. With the frame visible, find the **4 edge handles** (green rectangles at top, bottom, left, right)
2. **Hover** over an edge handle (e.g., top edge)
3. ✅ Handle should scale up and cursor should change (e.g., n-resize)
4. **Click and drag** an edge handle
5. ✅ Frame should resize in that direction only
6. ✅ Width or height changes independently
7. ✅ Dimensions update

**Expected Result**: Frame resizes in the direction you drag, independently of other dimension.

---

### Test 4: Custom Area Export (60 seconds)

1. Position and size the frame to cover a **specific area** of your workflow
2. Note which nodes are **inside** the frame
3. Click **"Export"** button (frame should disappear after export)
4. Open the downloaded PDF
5. ✅ PDF should only show the area that was inside the frame
6. ✅ Nodes outside the frame should NOT be in the PDF
7. ✅ PDF should be crisp and vector-based

**Expected Result**: Only the framed area is exported, not the whole canvas.

---

### Test 5: Background Color Export (30 seconds)

1. Open export modal
2. Check **"Include Background Color"**
3. If you have a dark theme, it should export dark background
4. Click **"Export"**
5. Open the downloaded PDF
6. ✅ PDF should have the background color visible
7. ✅ Background should cover the entire export area
8. ✅ Content should be clearly visible on the background

**Expected Result**: PDF includes the current theme's background color.

---

### Test 6: Background with Light Theme (30 seconds)

1. Toggle your theme to **light mode** (if available)
2. Open export modal
3. Check **"Include Background Color"**
4. Click **"Export"**
5. Open PDF
6. ✅ PDF should have light/white background
7. ✅ Text and nodes should be clearly visible

**Expected Result**: Background adapts to the current theme.

---

### Test 7: Combined Features (60 seconds)

1. Enable **"Show Export Frame"**
2. **Resize** the frame to a custom size (e.g., small area in the center)
3. **Move** the frame to a specific part of the workflow
4. Check **"Include Background Color"**
5. Select **A4 Landscape** format
6. Click **"Export"**
7. Open PDF
8. ✅ PDF shows only the framed area
9. ✅ PDF has background color
10. ✅ PDF is A4 landscape size
11. ✅ PDF is vector graphics (zoom in to verify crispness)

**Expected Result**: All features work together seamlessly.

---

### Test 8: Minimum Size Constraint (15 seconds)

1. With frame visible, try to resize it **very small**
2. ✅ Frame should stop at a minimum size (~100px)
3. ✅ Cannot make frame smaller than minimum

**Expected Result**: Frame respects minimum size limit.

---

### Test 9: Boundary Constraints (30 seconds)

1. **Drag** the frame to the **top-left corner** of the canvas
2. ✅ Frame should stop at the edge, not go outside
3. **Drag** the frame to the **bottom-right corner**
4. ✅ Frame should stop at the edge
5. Try to **resize** beyond the canvas boundaries
6. ✅ Frame should stay within the canvas

**Expected Result**: Frame always stays completely inside the canvas.

---

### Test 10: Multiple Resizes (30 seconds)

1. Resize from **top-left corner**
2. Then resize from **bottom edge**
3. Then resize from **right edge**
4. Then **drag** to a new position
5. ✅ All operations should work smoothly
6. ✅ Dimensions should update correctly each time

**Expected Result**: Can resize and move as many times as needed without issues.

---

## Visual Inspection Checklist

When frame is visible, check that you can see:

- [ ] Green dashed border
- [ ] Semi-transparent green fill
- [ ] "Export Area (Drag to move, resize from corners/edges)" label at top
- [ ] Dimensions label at bottom (shows mm and px)
- [ ] 4 circular corner handles (green with white border)
- [ ] 4 rectangular edge handles (green with white border)
- [ ] Hover effects on handles (they grow and get brighter)
- [ ] Proper cursors when hovering (move, nw-resize, n-resize, etc.)

## Common Issues & Solutions

### Issue: Frame doesn't appear
**Solution**: 
- Make sure "Show Export Frame" is checked
- Make sure format is set to "PDF" (frame only shows for PDF)
- Refresh the page and try again

### Issue: Can't drag the frame
**Solution**:
- Click on the frame body, not on a handle
- Make sure you're not clicking on a handle (circles or rectangles)

### Issue: Frame resizes strangely
**Solution**:
- Corner handles maintain aspect ratio (this is intentional)
- Use edge handles for independent width/height adjustment

### Issue: Background color not showing
**Solution**:
- Make sure "Include Background Color" is checked
- Try toggling theme and exporting again
- Check if your theme has a transparent background

### Issue: Export includes more than frame
**Solution**:
- Make sure frame was visible when you clicked Export
- Frame might have been positioned incorrectly
- Try repositioning the frame and exporting again

---

## Success Criteria

All tests should pass with these results:

✅ Frame is draggable  
✅ Frame is resizable from 8 handles  
✅ Constraints work (min size, boundaries)  
✅ Custom area export works  
✅ Background color export works  
✅ All features work together  
✅ No console errors  
✅ Smooth performance (60 FPS)  

---

## Time to Test
**Total Time**: ~6 minutes for all tests

Ready to test? Open http://localhost:5174/ and start with Test 1!

---

**Last Updated**: October 8, 2025  
**Branch**: `feature/enhanced-export-options`
