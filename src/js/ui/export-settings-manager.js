/**
 * Export Settings Manager
 * Manages export configuration, page formats, and export frame overlay
 */

/**
 * Page format definitions in millimeters
 */
export const PAGE_FORMATS = {
    a4: { width: 210, height: 297, name: 'A4' },
    a3: { width: 297, height: 420, name: 'A3' },
    a5: { width: 148, height: 210, name: 'A5' },
    letter: { width: 216, height: 279, name: 'Letter' },
    legal: { width: 216, height: 356, name: 'Legal' },
    tabloid: { width: 279, height: 432, name: 'Tabloid' }
};

/**
 * Default export settings
 */
const DEFAULT_SETTINGS = {
    format: 'pdf',
    pageSize: 'a4',
    orientation: 'landscape',
    customWidth: 297,
    customHeight: 210,
    includeBackground: false,
    showFrame: false
};

/**
 * Current export settings
 */
let currentSettings = { ...DEFAULT_SETTINGS };

/**
 * Export frame element reference
 */
let exportFrameElement = null;

/**
 * Export frame state for dragging and resizing
 */
let frameState = {
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startWidth: 0,
    startHeight: 0,
    // Store the last calculated bounds for export (in case frame is hidden)
    lastBounds: null
};

/**
 * Initialize the export settings manager
 * Sets up event listeners for the export modal
 */
export function initExportSettings() {
    const exportBtn = document.getElementById('exportBtn');
    const exportModal = document.getElementById('exportModal');
    const closeModalBtn = document.getElementById('closeExportModalBtn');
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    const exportFormatSelect = document.getElementById('exportFormat');
    const pageSizeSelect = document.getElementById('pdfPageSize');
    const orientationSelect = document.getElementById('pdfOrientation');
    const customSizeDiv = document.getElementById('customPdfSize');
    const pdfOptionsDiv = document.getElementById('pdfOptions');
    const showFrameCheckbox = document.getElementById('showExportFrame');

    // Load saved settings from localStorage
    loadSettings();

    // Show modal when export button is clicked
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportModal.style.display = 'block';
            updateModalUI();
            if (currentSettings.showFrame) {
                showExportFrame();
            }
        });
    }

    // Close modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            exportModal.style.display = 'none';
            hideExportFrame();
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.style.display = 'none';
            hideExportFrame();
        }
    });

    // Export format change
    if (exportFormatSelect) {
        exportFormatSelect.addEventListener('change', (e) => {
            currentSettings.format = e.target.value;
            pdfOptionsDiv.style.display = e.target.value === 'pdf' ? 'block' : 'none';
            saveSettings();
            if (currentSettings.showFrame && e.target.value === 'pdf') {
                updateExportFrame();
            }
        });
    }

    // Page size change
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            currentSettings.pageSize = e.target.value;
            customSizeDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
            saveSettings();
            if (currentSettings.showFrame) {
                updateExportFrame();
            }
        });
    }

    // Orientation change
    if (orientationSelect) {
        orientationSelect.addEventListener('change', (e) => {
            currentSettings.orientation = e.target.value;
            saveSettings();
            if (currentSettings.showFrame) {
                updateExportFrame();
            }
        });
    }

    // Custom size inputs
    const widthInput = document.getElementById('pdfWidth');
    const heightInput = document.getElementById('pdfHeight');
    
    if (widthInput) {
        widthInput.addEventListener('change', (e) => {
            currentSettings.customWidth = parseFloat(e.target.value);
            saveSettings();
            if (currentSettings.showFrame) {
                updateExportFrame();
            }
        });
    }

    if (heightInput) {
        heightInput.addEventListener('change', (e) => {
            currentSettings.customHeight = parseFloat(e.target.value);
            saveSettings();
            if (currentSettings.showFrame) {
                updateExportFrame();
            }
        });
    }

    // Background checkbox
    const bgCheckbox = document.getElementById('includeBackground');
    if (bgCheckbox) {
        bgCheckbox.addEventListener('change', (e) => {
            currentSettings.includeBackground = e.target.checked;
            saveSettings();
        });
    }

    // Show frame checkbox
    if (showFrameCheckbox) {
        showFrameCheckbox.addEventListener('change', (e) => {
            currentSettings.showFrame = e.target.checked;
            saveSettings();
            if (e.target.checked) {
                showExportFrame();
            } else {
                hideExportFrame();
            }
        });
    }

    // Confirm export button
    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', async () => {
            // Calculate and store frame bounds BEFORE hiding
            console.log('🔍 Export confirm clicked. showFrame:', currentSettings.showFrame, 'element:', exportFrameElement, 'display:', exportFrameElement?.style.display);
            
            if (currentSettings.showFrame && exportFrameElement && exportFrameElement.style.display !== 'none') {
                const bounds = calculateFrameBounds();
                if (bounds) {
                    frameState.lastBounds = bounds;
                    console.log('📐 Stored frame bounds for export:', frameState.lastBounds);
                } else {
                    console.warn('⚠️ Frame bounds calculation returned null');
                }
            } else {
                console.log('❌ Skipping frame bounds storage - condition failed');
                frameState.lastBounds = null;
            }
            
            exportModal.style.display = 'none';
            hideExportFrame();
            // Trigger export (will be handled by the export module)
            const event = new CustomEvent('confirmExport', { detail: currentSettings });
            window.dispatchEvent(event);
        });
    }
}

/**
 * Get current export settings
 * @returns {Object} Current export settings
 */
export function getExportSettings() {
    return { ...currentSettings };
}

/**
 * Calculate frame bounds in SVG coordinates (helper function)
 * @returns {Object|null} Frame bounds in SVG coordinates {x, y, width, height}
 */
function calculateFrameBounds() {
    if (!exportFrameElement) return null;

    const networkGraph = document.getElementById('networkGraph');
    const svg = networkGraph?.querySelector('svg');
    if (!svg) return null;

    // Get frame position and size in pixels
    const frameRect = {
        left: exportFrameElement.offsetLeft,
        top: exportFrameElement.offsetTop,
        width: exportFrameElement.offsetWidth,
        height: exportFrameElement.offsetHeight
    };

    console.log('🖼️ Frame pixel bounds:', frameRect);

    // Get SVG viewBox to convert pixel coordinates to SVG coordinates
    const svgRect = svg.getBoundingClientRect();
    const viewBox = svg.getAttribute('viewBox');
    
    console.log('🔍 SVG viewBox attribute:', viewBox);
    console.log('📐 SVG bounding rect:', svgRect);
    
    if (viewBox) {
        const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
        
        // Calculate scale factors
        const scaleX = vbWidth / svgRect.width;
        const scaleY = vbHeight / svgRect.height;
        
        console.log('🔢 SVG viewBox:', { vbX, vbY, vbWidth, vbHeight });
        console.log('📏 Scale factors:', { scaleX, scaleY });
        
        // Convert frame bounds to SVG coordinates
        const bounds = {
            x: vbX + (frameRect.left * scaleX),
            y: vbY + (frameRect.top * scaleY),
            width: frameRect.width * scaleX,
            height: frameRect.height * scaleY
        };
        
        console.log('📐 Calculated SVG bounds:', bounds);
        return bounds;
    }
    
    // If no viewBox, use pixel coordinates directly (1:1 mapping)
    console.warn('⚠️ No viewBox found on SVG, using pixel coordinates directly');
    return {
        x: frameRect.left,
        y: frameRect.top,
        width: frameRect.width,
        height: frameRect.height
    };
}

/**
 * Get the export frame bounds if visible
 * @returns {Object|null} Frame bounds {x, y, width, height} in SVG coordinates, or null if not visible
 */
export function getExportFrameBounds() {
    // If we have stored bounds (from before hiding frame), use those
    if (frameState.lastBounds) {
        console.log('✅ Using stored frame bounds:', frameState.lastBounds);
        return frameState.lastBounds;
    }
    
    // Otherwise try to calculate from current DOM state
    if (!currentSettings.showFrame || !exportFrameElement || exportFrameElement.style.display === 'none') {
        console.log('❌ No frame bounds available (frame not shown or hidden)');
        return null;
    }

    const bounds = calculateFrameBounds();
    console.log('🔄 Calculated frame bounds on-the-fly:', bounds);
    return bounds;
}

/**
 * Get page dimensions in millimeters based on current settings
 * @returns {Object} Object with width and height in mm
 */
export function getPageDimensions() {
    let width, height;

    if (currentSettings.pageSize === 'custom') {
        width = currentSettings.customWidth;
        height = currentSettings.customHeight;
    } else {
        const format = PAGE_FORMATS[currentSettings.pageSize];
        width = format.width;
        height = format.height;
    }

    // Swap dimensions if landscape
    if (currentSettings.orientation === 'landscape') {
        return { width: Math.max(width, height), height: Math.min(width, height) };
    } else {
        return { width: Math.min(width, height), height: Math.max(width, height) };
    }
}

/**
 * Update the modal UI to reflect current settings
 */
function updateModalUI() {
    const exportFormatSelect = document.getElementById('exportFormat');
    const pageSizeSelect = document.getElementById('pdfPageSize');
    const orientationSelect = document.getElementById('pdfOrientation');
    const widthInput = document.getElementById('pdfWidth');
    const heightInput = document.getElementById('pdfHeight');
    const bgCheckbox = document.getElementById('includeBackground');
    const showFrameCheckbox = document.getElementById('showExportFrame');
    const customSizeDiv = document.getElementById('customPdfSize');
    const pdfOptionsDiv = document.getElementById('pdfOptions');

    if (exportFormatSelect) exportFormatSelect.value = currentSettings.format;
    if (pageSizeSelect) pageSizeSelect.value = currentSettings.pageSize;
    if (orientationSelect) orientationSelect.value = currentSettings.orientation;
    if (widthInput) widthInput.value = currentSettings.customWidth;
    if (heightInput) heightInput.value = currentSettings.customHeight;
    if (bgCheckbox) bgCheckbox.checked = currentSettings.includeBackground;
    if (showFrameCheckbox) showFrameCheckbox.checked = currentSettings.showFrame;

    if (customSizeDiv) {
        customSizeDiv.style.display = currentSettings.pageSize === 'custom' ? 'block' : 'none';
    }
    if (pdfOptionsDiv) {
        pdfOptionsDiv.style.display = currentSettings.format === 'pdf' ? 'block' : 'none';
    }
}

/**
 * Show the export frame overlay on the visualization
 */
function showExportFrame() {
    if (currentSettings.format !== 'pdf') {
        return; // Only show frame for PDF exports
    }

    const networkGraph = document.getElementById('networkGraph');
    if (!networkGraph) return;

    // Remove existing frame if any
    hideExportFrame();

    // Create frame element
    exportFrameElement = document.createElement('div');
    exportFrameElement.className = 'export-frame';
    exportFrameElement.id = 'exportFrame';

    // Add resize handles (corners and edges)
    const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
    handles.forEach(handle => {
        const handleEl = document.createElement('div');
        handleEl.className = `export-frame-handle export-frame-handle-${handle}`;
        handleEl.dataset.handle = handle;
        exportFrameElement.appendChild(handleEl);
    });

    // Add dimensions label
    const dimensionsLabel = document.createElement('div');
    dimensionsLabel.className = 'export-frame-dimensions';
    exportFrameElement.appendChild(dimensionsLabel);

    networkGraph.appendChild(exportFrameElement);

    // Update frame dimensions and position
    updateExportFrame();

    // Add drag and resize event listeners
    initializeFrameInteractions();
}

/**
 * Initialize drag and resize interactions for the export frame
 */
function initializeFrameInteractions() {
    if (!exportFrameElement) return;

    // Make the frame draggable (not the handles)
    exportFrameElement.addEventListener('mousedown', handleFrameMouseDown);

    // Add resize handlers to each handle
    const handles = exportFrameElement.querySelectorAll('.export-frame-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', handleResizeMouseDown);
    });

    // Global mouse move and up handlers
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

/**
 * Handle mouse down on the export frame (for dragging)
 */
function handleFrameMouseDown(e) {
    // Only drag if clicking on the frame itself, not a handle
    if (e.target.classList.contains('export-frame-handle')) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    frameState.isDragging = true;
    frameState.startX = e.clientX;
    frameState.startY = e.clientY;
    frameState.startLeft = exportFrameElement.offsetLeft;
    frameState.startTop = exportFrameElement.offsetTop;

    exportFrameElement.style.cursor = 'move';
}

/**
 * Handle mouse down on a resize handle
 */
function handleResizeMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    frameState.isResizing = true;
    frameState.resizeHandle = e.target.dataset.handle;
    frameState.startX = e.clientX;
    frameState.startY = e.clientY;
    frameState.startLeft = exportFrameElement.offsetLeft;
    frameState.startTop = exportFrameElement.offsetTop;
    frameState.startWidth = exportFrameElement.offsetWidth;
    frameState.startHeight = exportFrameElement.offsetHeight;
}

/**
 * Handle mouse move for dragging and resizing
 */
function handleMouseMove(e) {
    if (!exportFrameElement) return;

    if (frameState.isDragging) {
        e.preventDefault();
        const dx = e.clientX - frameState.startX;
        const dy = e.clientY - frameState.startY;

        const networkGraph = document.getElementById('networkGraph');
        const graphRect = networkGraph.getBoundingClientRect();

        let newLeft = frameState.startLeft + dx;
        let newTop = frameState.startTop + dy;

        // Constrain to graph boundaries
        newLeft = Math.max(0, Math.min(newLeft, graphRect.width - exportFrameElement.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, graphRect.height - exportFrameElement.offsetHeight));

        exportFrameElement.style.left = `${newLeft}px`;
        exportFrameElement.style.top = `${newTop}px`;

    } else if (frameState.isResizing) {
        e.preventDefault();
        const dx = e.clientX - frameState.startX;
        const dy = e.clientY - frameState.startY;

        const networkGraph = document.getElementById('networkGraph');
        const graphRect = networkGraph.getBoundingClientRect();
        const handle = frameState.resizeHandle;

        let newLeft = frameState.startLeft;
        let newTop = frameState.startTop;
        let newWidth = frameState.startWidth;
        let newHeight = frameState.startHeight;

        // Get current page aspect ratio
        const dimensions = getPageDimensions();
        const aspectRatio = dimensions.width / dimensions.height;

        // Handle different resize directions
        if (handle.includes('e')) { // East (right)
            newWidth = frameState.startWidth + dx;
        }
        if (handle.includes('w')) { // West (left)
            newWidth = frameState.startWidth - dx;
            newLeft = frameState.startLeft + dx;
        }
        if (handle.includes('s')) { // South (bottom)
            newHeight = frameState.startHeight + dy;
        }
        if (handle.includes('n')) { // North (top)
            newHeight = frameState.startHeight - dy;
            newTop = frameState.startTop + dy;
        }

        // Maintain aspect ratio for corner handles
        if (handle.length === 2) {
            // Corner handle - maintain aspect ratio
            if (handle.includes('e') || handle.includes('w')) {
                newHeight = newWidth / aspectRatio;
                if (handle.includes('n')) {
                    newTop = frameState.startTop + frameState.startHeight - newHeight;
                }
            } else {
                newWidth = newHeight * aspectRatio;
                if (handle.includes('w')) {
                    newLeft = frameState.startLeft + frameState.startWidth - newWidth;
                }
            }
        }

        // Apply minimum and maximum constraints
        const minSize = 100; // pixels
        const maxWidth = graphRect.width;
        const maxHeight = graphRect.height;

        newWidth = Math.max(minSize, Math.min(newWidth, maxWidth));
        newHeight = Math.max(minSize, Math.min(newHeight, maxHeight));

        // Constrain position to graph boundaries
        newLeft = Math.max(0, Math.min(newLeft, graphRect.width - newWidth));
        newTop = Math.max(0, Math.min(newTop, graphRect.height - newHeight));

        exportFrameElement.style.left = `${newLeft}px`;
        exportFrameElement.style.top = `${newTop}px`;
        exportFrameElement.style.width = `${newWidth}px`;
        exportFrameElement.style.height = `${newHeight}px`;

        // Update dimensions label
        updateFrameDimensionsLabel();
    }
}

/**
 * Handle mouse up to end dragging/resizing
 */
function handleMouseUp(e) {
    if (frameState.isDragging || frameState.isResizing) {
        e.preventDefault();
        frameState.isDragging = false;
        frameState.isResizing = false;
        frameState.resizeHandle = null;

        if (exportFrameElement) {
            exportFrameElement.style.cursor = '';
        }
    }
}

/**
 * Update the dimensions label on the export frame
 */
function updateFrameDimensionsLabel() {
    if (!exportFrameElement) return;

    const dimensionsLabel = exportFrameElement.querySelector('.export-frame-dimensions');
    if (!dimensionsLabel) return;

    const dimensions = getPageDimensions();
    const width = exportFrameElement.offsetWidth;
    const height = exportFrameElement.offsetHeight;

    // Show both pixel and paper dimensions
    dimensionsLabel.textContent = `${dimensions.width} × ${dimensions.height} mm (${Math.round(width)} × ${Math.round(height)} px)`;
}

/**
 * Hide the export frame overlay
 */
function hideExportFrame() {
    if (exportFrameElement) {
        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        exportFrameElement.remove();
        exportFrameElement = null;
    }
    
    // Reset frame state
    frameState.isDragging = false;
    frameState.isResizing = false;
    frameState.resizeHandle = null;
}

/**
 * Update export frame dimensions and position based on page settings
 */
function updateExportFrame() {
    if (!exportFrameElement) return;

    const networkGraph = document.getElementById('networkGraph');
    const svg = networkGraph?.querySelector('svg');
    if (!svg) return;

    const dimensions = getPageDimensions();
    const svgRect = svg.getBoundingClientRect();
    const graphRect = networkGraph.getBoundingClientRect();

    // Calculate aspect ratio
    const pageAspectRatio = dimensions.width / dimensions.height;

    // Determine frame size to fit within the graph while maintaining aspect ratio
    let frameWidth, frameHeight;
    const maxWidth = svgRect.width * 0.8;  // 80% of SVG width
    const maxHeight = svgRect.height * 0.8; // 80% of SVG height

    if (maxWidth / maxHeight > pageAspectRatio) {
        // Height is the limiting factor
        frameHeight = maxHeight;
        frameWidth = frameHeight * pageAspectRatio;
    } else {
        // Width is the limiting factor
        frameWidth = maxWidth;
        frameHeight = frameWidth / pageAspectRatio;
    }

    // Center the frame
    const left = (svgRect.width - frameWidth) / 2;
    const top = (svgRect.height - frameHeight) / 2;

    // Apply styles
    exportFrameElement.style.width = `${frameWidth}px`;
    exportFrameElement.style.height = `${frameHeight}px`;
    exportFrameElement.style.left = `${left}px`;
    exportFrameElement.style.top = `${top}px`;

    // Update dimensions label
    const dimensionsLabel = exportFrameElement.querySelector('.export-frame-dimensions');
    if (dimensionsLabel) {
        dimensionsLabel.textContent = `${dimensions.width} × ${dimensions.height} mm`;
    }
    
    updateFrameDimensionsLabel();
}

/**
 * Save current settings to localStorage
 */
function saveSettings() {
    try {
        localStorage.setItem('exportSettings', JSON.stringify(currentSettings));
    } catch (e) {
        console.warn('Failed to save export settings:', e);
    }
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    try {
        const saved = localStorage.getItem('exportSettings');
        if (saved) {
            currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Failed to load export settings:', e);
        currentSettings = { ...DEFAULT_SETTINGS };
    }
}

/**
 * Update export frame on window resize
 */
window.addEventListener('resize', () => {
    if (exportFrameElement) {
        updateExportFrame();
    }
});
