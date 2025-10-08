/**
 * Test Export Functionality
 * 
 * This test file verifies that the enhanced export functionality works correctly
 * Run this in the browser console after loading the application
 */

// Test 1: Verify export settings manager is initialized
console.log('Test 1: Checking if export settings manager is initialized...');
const exportBtn = document.getElementById('exportBtn');
const exportModal = document.getElementById('exportModal');
console.assert(exportBtn !== null, 'Export button should exist');
console.assert(exportModal !== null, 'Export modal should exist');
console.log('✓ Export UI elements found');

// Test 2: Verify page format options
console.log('\nTest 2: Checking page format options...');
const pageSizeSelect = document.getElementById('pdfPageSize');
const expectedFormats = ['a4', 'a3', 'a5', 'letter', 'legal', 'tabloid', 'custom'];
const actualFormats = Array.from(pageSizeSelect.options).map(opt => opt.value);
expectedFormats.forEach(format => {
    console.assert(actualFormats.includes(format), `Page format ${format} should be available`);
});
console.log('✓ All page formats available:', actualFormats);

// Test 3: Verify orientation options
console.log('\nTest 3: Checking orientation options...');
const orientationSelect = document.getElementById('pdfOrientation');
console.assert(orientationSelect !== null, 'Orientation select should exist');
const orientations = Array.from(orientationSelect.options).map(opt => opt.value);
console.assert(orientations.includes('landscape'), 'Landscape option should exist');
console.assert(orientations.includes('portrait'), 'Portrait option should exist');
console.log('✓ Orientation options available:', orientations);

// Test 4: Verify export frame checkbox
console.log('\nTest 4: Checking export frame checkbox...');
const showFrameCheckbox = document.getElementById('showExportFrame');
console.assert(showFrameCheckbox !== null, 'Export frame checkbox should exist');
console.log('✓ Export frame checkbox found');

// Test 5: Verify custom size inputs
console.log('\nTest 5: Checking custom size inputs...');
const pdfWidth = document.getElementById('pdfWidth');
const pdfHeight = document.getElementById('pdfHeight');
console.assert(pdfWidth !== null, 'Width input should exist');
console.assert(pdfHeight !== null, 'Height input should exist');
console.assert(pdfWidth.min === '50', 'Width min should be 50');
console.assert(pdfWidth.max === '2000', 'Width max should be 2000');
console.assert(pdfHeight.min === '50', 'Height min should be 50');
console.assert(pdfHeight.max === '2000', 'Height max should be 2000');
console.log('✓ Custom size inputs configured correctly');

// Test 6: Verify export format options
console.log('\nTest 6: Checking export format options...');
const exportFormatSelect = document.getElementById('exportFormat');
const formats = Array.from(exportFormatSelect.options).map(opt => opt.value);
console.assert(formats.includes('pdf'), 'PDF format should be available');
console.assert(formats.includes('svg'), 'SVG format should be available');
console.log('✓ Export formats available:', formats);

// Test 7: Simulate modal opening
console.log('\nTest 7: Simulating export modal open...');
exportBtn.click();
const isModalVisible = exportModal.style.display === 'block';
console.assert(isModalVisible, 'Modal should be visible after clicking export button');
console.log('✓ Export modal opens successfully');

// Test 8: Check if export frame can be toggled
console.log('\nTest 8: Testing export frame toggle...');
showFrameCheckbox.checked = true;
showFrameCheckbox.dispatchEvent(new Event('change'));
setTimeout(() => {
    const exportFrame = document.getElementById('exportFrame');
    if (exportFrame) {
        console.log('✓ Export frame appears when checkbox is enabled');
        console.log('  Frame dimensions:', exportFrame.style.width, 'x', exportFrame.style.height);
    } else {
        console.warn('⚠ Export frame not visible (may require PDF format selected)');
    }
    
    // Clean up - close modal
    document.getElementById('closeExportModalBtn').click();
    console.log('\n✅ All tests completed!');
}, 100);

// Test 9: Verify svg2pdf.js is loaded
console.log('\nTest 9: Checking if svg2pdf.js is loaded...');
import('svg2pdf.js').then(() => {
    console.log('✓ svg2pdf.js module loaded successfully');
}).catch((err) => {
    console.error('✗ Failed to load svg2pdf.js:', err);
});

console.log('\n--- Export Functionality Test Complete ---');
console.log('To manually test export:');
console.log('1. Click the "Export" button');
console.log('2. Select PDF format and A4 page size');
console.log('3. Enable "Show Export Frame on Canvas"');
console.log('4. Click "Export" and check the downloaded file');
console.log('5. Verify the PDF is small (<1MB) and has crisp vector graphics');
