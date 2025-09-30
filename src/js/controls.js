import * as layoutManager from './layoutManager.js';

/**
 * Binds all the UI event listeners to their respective DOM elements.
 * @param {object} handlers - An object containing the handler functions.
 */
export function bindControlEventListeners(handlers) {
    // File and data loading
    document.getElementById('csvFile').addEventListener('change', handlers.handleFileSelect);
    document.getElementById('uploadBtn').addEventListener('click', handlers.handleFileUpload);

    // Search and filter
    document.getElementById('searchInput').addEventListener('input', (e) => handlers.handleSearch(e.target.value));
    document.getElementById('add-filter-btn').addEventListener('click', () => addFilterRow(handlers.getFilterOptions, handlers.applyFilters));

    // View and layout controls
    document.getElementById('resetBtn').addEventListener('click', handlers.handleReset);
    document.getElementById('sizeToggle').addEventListener('change', (e) => handlers.handleSizeToggle(e.target.checked));
    document.getElementById('layoutSelect').addEventListener('change', (e) => handlers.handleLayoutChange(e.target.value));

    // Grid controls
    document.getElementById('showGridBtn').addEventListener('click', handlers.toggleGrid);
    document.getElementById('snapToGridBtn').addEventListener('click', handlers.snapAllToGrid);
    document.getElementById('saveLayoutBtn').addEventListener('click', handlers.saveLayout);
    document.getElementById('savedLayoutsSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            handlers.loadLayout(e.target.value);
            e.target.value = ''; // Reset dropdown after selection
        }
    });
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

    // Initial population of the layouts dropdown
    populateLayoutsDropdown();
}

/**
 * Fetches layouts from the server and populates the layout selection dropdown.
 */
export async function populateLayoutsDropdown() {
    const select = document.getElementById('savedLayoutsSelect');
    if (!select) return;

    const layouts = await layoutManager.getLayouts();

    // Clear existing options except the first placeholder
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add new options
    layouts.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
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
    document.getElementById('filter-container').innerHTML = '';
    document.getElementById('layoutSelect').value = 'force';
    document.getElementById('sizeToggle').checked = true;
    toggleGridControls(false);
    updateGridUI(false);
}

/**
 * Adds a new filter row to the advanced filter container.
 * @param {function} getFilterOptions - Function to get the available filter options.
 * @param {function} applyFilters - Function to apply the filters.
 */
export function addFilterRow(getFilterOptions, applyFilters) {
    const filterContainer = document.getElementById('filter-container');
    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row';

    const columnSelect = document.createElement('select');
    columnSelect.className = 'form-control form-control--sm';

    const valueSelect = document.createElement('select');
    valueSelect.className = 'form-control form-control--sm';
    valueSelect.multiple = true;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn--danger btn--sm';
    removeBtn.textContent = 'X';
    removeBtn.addEventListener('click', () => {
        filterRow.remove();
        applyFilters();
    });

    filterRow.appendChild(columnSelect);
    filterRow.appendChild(valueSelect);
    filterRow.appendChild(removeBtn);
    filterContainer.appendChild(filterRow);

    populateFilterRow(filterRow, getFilterOptions, applyFilters);
    applyFilters();
}

/**
 * Populates a filter row with column and value options.
 * @param {HTMLElement} filterRow - The filter row element.
 * @param {function} getFilterOptions - Function to get the available filter options.
 * @param {function} applyFilters - Function to apply the filters.
 */
function populateFilterRow(filterRow, getFilterOptions, applyFilters) {
    const columnSelect = filterRow.querySelector('select:first-child');
    const valueSelect = filterRow.querySelector('select:last-of-type');
    const { columns } = getFilterOptions();

    columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
        columnSelect.appendChild(option);
    });

    columnSelect.addEventListener('change', () => {
        const selectedColumn = columnSelect.value;
        const { values } = getFilterOptions(selectedColumn);
        valueSelect.innerHTML = '';
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            valueSelect.appendChild(option);
        });
        applyFilters();
    });

    valueSelect.addEventListener('change', applyFilters);

    // Initial population
    columnSelect.dispatchEvent(new Event('change'));
}