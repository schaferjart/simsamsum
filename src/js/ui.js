/**
 * Binds all the UI event listeners to their respective DOM elements.
 * @param {object} handlers - An object containing the handler functions.
 */
export function bindEventListeners(handlers) {
    // File and data loading
    document.getElementById('csvFile').addEventListener('change', handlers.handleFileSelect);
    document.getElementById('uploadBtn').addEventListener('click', handlers.handleFileUpload);
    document.getElementById('sampleBtn').addEventListener('click', handlers.handleSampleData);

    // Search and filter
    document.getElementById('searchInput').addEventListener('input', (e) => handlers.handleSearch(e.target.value));
    document.getElementById('typeFilter').addEventListener('change', handlers.handleFilter);
    document.getElementById('executionFilter').addEventListener('change', handlers.handleFilter);

    // View and layout controls
    document.getElementById('resetBtn').addEventListener('click', handlers.handleReset);
    document.getElementById('sizeToggle').addEventListener('change', (e) => handlers.handleSizeToggle(e.target.checked));
    document.getElementById('layoutSelect').addEventListener('change', (e) => handlers.handleLayoutChange(e.target.value));

    // Grid controls
    document.getElementById('showGridBtn').addEventListener('click', handlers.toggleGrid);
    document.getElementById('snapToGridBtn').addEventListener('click', handlers.snapAllToGrid);
    document.getElementById('savePositionsBtn').addEventListener('click', handlers.saveLayout);
    document.getElementById('loadPositionsBtn').addEventListener('click', handlers.loadLayout);
    document.getElementById('gridSizeSlider').addEventListener('input', (e) => handlers.updateGridSize(parseInt(e.target.value, 10)));

    // Orientation controls
    document.getElementById('rotateLeftBtn').addEventListener('click', () => handlers.rotateGraph(-90));
    document.getElementById('rotateRightBtn').addEventListener('click', () => handlers.rotateGraph(90));
    document.getElementById('flipHorizontalBtn').addEventListener('click', () => handlers.flipGraph('horizontal'));
    document.getElementById('flipVerticalBtn').addEventListener('click', () => handlers.flipGraph('vertical'));
    document.getElementById('centerGraphBtn').addEventListener('click', handlers.centerGraph);
    document.getElementById('fitToScreenBtn').addEventListener('click', handlers.fitToScreen);

    // Other UI actions
    document.getElementById('verifyBtn').addEventListener('click', handlers.handleVerify);
    document.getElementById('exportPdfBtn').addEventListener('click', handlers.handleExport);
    document.getElementById('closePanelBtn').addEventListener('click', hideDetailsPanel);

    // Window resize
    window.addEventListener('resize', handlers.handleResize);
}

/**
 * Shows the details panel with information about the selected node.
 * @param {object} node - The data object for the selected node.
 */
export function showNodeDetails(node) {
    const panel = document.getElementById('detailsPanel');
    const content = document.getElementById('nodeDetails');

    if (!panel || !content) return;

    const details = [
        { label: 'Name', value: node.Name || 'N/A' },
        { label: 'Type', value: node.Type || 'N/A' },
        { label: 'Execution', value: node.Execution || 'N/A' },
        { label: 'Platform', value: node.Platform || 'N/A' },
        { label: 'Monitoring', value: node.Monitoring || 'N/A' },
        { label: 'Ø Cost', value: (node["Ø Cost"] !== null && node["Ø Cost"] !== undefined) ? `€${node["Ø Cost"]}` : 'N/A' },
        { label: 'Effective Cost', value: (node["Effective Cost"] !== null && node["Effective Cost"] !== undefined) ? `€${node["Effective Cost"]}` : 'N/A' },
        { label: 'Node Size', value: `${Math.round(node.size)}px` },
        { label: 'Incoming', value: node.Incoming || 'None' },
    ];

    // Add outgoing connections dynamically
    for (let i = 1; i <= 5; i++) {
        if (node[`Outgoing${i}`]) {
            details.push({ label: `Outgoing ${i}`, value: node[`Outgoing${i}`] });
        }
    }

    content.innerHTML = details.map(detail => `
        <div class="detail-row">
            <div class="detail-label">${detail.label}</div>
            <div class="detail-value">${detail.value}</div>
        </div>
    `).join('');

    panel.classList.remove('hidden');
}

/**
 * Hides the details panel.
 */
export function hideDetailsPanel() {
    document.getElementById('detailsPanel')?.classList.add('hidden');
}

/**
 * Toggles the visibility of the grid controls.
 * @param {boolean} visible - Whether the controls should be visible.
 */
export function toggleGridControls(visible) {
    const gridControls = document.getElementById('gridControls');
    if (gridControls) {
        gridControls.style.display = visible ? 'block' : 'none';
    }
}

/**
 * Updates the UI for the grid display.
 * @param {boolean} showGrid - Whether the grid is currently shown.
 */
export function updateGridUI(showGrid) {
    const btn = document.getElementById('showGridBtn');
    if (btn) {
        btn.textContent = showGrid ? '📐 Hide Grid' : '📐 Show Grid';
        btn.classList.toggle('btn--active', showGrid);
    }
}

/**
 * Updates the grid size label.
 * @param {number} newSize - The new grid size.
 */
export function updateGridSizeLabel(newSize) {
    const label = document.getElementById('gridSizeLabel');
    if (label) {
        label.textContent = `${newSize}px`;
    }
}

/**
 * Resets the UI filters and controls to their default state.
 */
export function resetUI() {
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('executionFilter').value = '';
    document.getElementById('layoutSelect').value = 'force';
    document.getElementById('sizeToggle').checked = true;
    hideDetailsPanel();
    toggleGridControls(false);
    updateGridUI(false);
}