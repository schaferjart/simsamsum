// Barrel file for the UI module

// Import from all sub-modules
import * as domConstants from './dom-constants.js';
import * as filterUI from './filter-ui.js';
import * as stylingUI from './styling-ui.js';
import * as panelManager from './panel-manager.js';
import * as themeManager from './theme-manager.js';
import * as apiClient from './api-client.js';
import * as handsontableManager from './handsontable-manager.js';
import * as layoutManager from '../layoutManager.js';
import { showStatus, generateIdFromName } from '../utils.js';

// --- Re-export a unified public API ---

// Constants
export const { NODE_COLUMNS, CONNECTION_COLUMNS, OPERATORS } = domConstants;
export const NUMERIC_NODE_COLUMNS = NODE_COLUMNS.filter(col => col.type === 'number');
export const DEFAULT_SIZE_COLUMN = 'incomingVolume';

// Filter UI
export const { addFilterRule, addFilterRuleFromData, getFilterMode, getFilterRules } = filterUI;

// Styling UI
export const { addStylingRule, addStylingRuleFromData, getStylingRules, getDerivedStylingRules } = stylingUI;

// Panel Management
export const { showNodeDetails, hideDetailsPanel, toggleControlsPanel } = panelManager;

// Theme Management
export const { toggleTheme, initializeTheme } = themeManager;

// Handsontable (Data Grids)
export const {
    initEditorTables,
    refreshEditorData,
    updateTableSelectionHighlights,
    updateElementComputedFields,
    highlightTableRowByNodeId,
    clearTableRowHoverHighlight,
    showVariablesUI,
} = handsontableManager;

// API Client (Filter Sets)
export const { populateFilterSetsDropdown, initializeApiClient } = apiClient;

// --- Functions that remain in the main UI module ---

// This section will contain functions that orchestrate across multiple sub-modules,
// like bindEventListeners, or functions that are simple and don't fit elsewhere yet.

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
 * Binds all the UI event listeners to their respective DOM elements.
 * @param {object} handlers - An object containing the handler functions.
 */
export function bindEventListeners(handlers) {
    // Initialize API client with dependencies
    initializeApiClient({
        getFilterRules: filterUI.getFilterRules,
        getStylingRules: stylingUI.getStylingRules,
        addFilterRule: filterUI.addFilterRuleFromData,
        addStylingRule: stylingUI.addStylingRuleFromData
    });

    // Dynamic filtering and styling
    document.getElementById('add-filter-rule-btn').addEventListener('click', () => {
        addFilterRule(handlers.applyFiltersAndStyles);
    });
    document.getElementById('add-styling-rule-btn').addEventListener('click', () => {
        addStylingRule(handlers.applyFiltersAndStyles);
    });

    // Filter mode change
    document.querySelectorAll('input[name="filter-mode"]').forEach(radio => {
        radio.addEventListener('change', handlers.applyFiltersAndStyles);
    });

    // Filter set management
    document.getElementById('saveFilterSetBtn').addEventListener('click', async () => {
        const name = prompt('Enter a name for this filter set:');
        if (name) {
            await apiClient.saveFilterSet(name.trim());
            handlers.applyFiltersAndStyles();
        }
    });

    document.getElementById('filterSetsSelect').addEventListener('change', async (e) => {
        if (e.target.value) {
            const loaded = await apiClient.loadFilterSet(e.target.value);
            if (loaded) {
                handlers.applyFiltersAndStyles();
            } else {
                e.target.value = '';
            }
        }
    });

    document.getElementById('deleteFilterSetBtn').addEventListener('click', async () => {
        const select = document.getElementById('filterSetsSelect');
        const name = select.value;
        if (name && confirm(`Delete filter set "${name}"?`)) {
            const deleted = await apiClient.deleteFilterSet(name);
            if (deleted) {
                select.value = '';
            }
        }
    });

    // View and layout controls
    document.getElementById('resetBtn').addEventListener('click', handlers.handleReset);
    document.getElementById('sizeToggle').addEventListener('change', (e) => handlers.handleSizeToggle(e.target.checked));
    document.getElementById('sizeColumnSelect').addEventListener('change', (e) => handlers.handleSizeColumnChange(e.target.value));
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
    document.getElementById('closePanelBtn').addEventListener('click', hideDetailsPanel);
    document.getElementById('showEditorBtn').addEventListener('click', hideDetailsPanel);
    document.getElementById('toggleControlsBtn').addEventListener('click', toggleControlsPanel);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Window resize
    window.addEventListener('resize', handlers.handleResize);

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + B to toggle controls panel
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            toggleControlsPanel();
        }
        // Ctrl/Cmd + D to toggle dark theme
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            toggleTheme();
        }
    });

    // Initial population of the layouts dropdown
    populateLayoutsDropdown();
    
    // Initial population of the filter sets dropdown
    populateFilterSetsDropdown();

    // Initialize theme
    initializeTheme();
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
        btn.textContent = showGrid ? 'Hide Grid' : 'Show Grid';
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
    document.getElementById('filter-rules-container').innerHTML = '';
    document.getElementById('styling-rules-container').innerHTML = '';
    document.getElementById('layoutSelect').value = 'force';
    updateSizeControlUI({ enabled: true, column: DEFAULT_SIZE_COLUMN });
    toggleGridControls(false);
    updateGridUI(false);
}

export function getNumericNodeColumns() {
    return NUMERIC_NODE_COLUMNS.map(col => ({ ...col }));
}

export function getDefaultSizeColumn() {
    return DEFAULT_SIZE_COLUMN;
}

export function updateSizeControlUI(state = {}, columns = null) {
    const enabled = state?.enabled !== false;
    const desiredColumn = state?.column || DEFAULT_SIZE_COLUMN;
    const toggle = document.getElementById('sizeToggle');
    const select = document.getElementById('sizeColumnSelect');
    const label = document.querySelector('.size-toggle-label');

    if (toggle) {
        toggle.checked = enabled;
    }

    if (!select) {
        if (label) {
            label.textContent = enabled ? `Scale by ${desiredColumn}` : 'Uniform size';
        }
        return;
    }

    const optionsSource = Array.isArray(columns) && columns.length ? columns : NUMERIC_NODE_COLUMNS;
    const uniqueIds = new Set();
    const normalizedOptions = optionsSource.filter(col => {
        if (!col || !col.id || uniqueIds.has(col.id)) return false;
        uniqueIds.add(col.id);
        return true;
    });

    select.innerHTML = '';

    if (normalizedOptions.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No numeric columns';
        select.appendChild(option);
        select.value = '';
        select.disabled = true;
        if (label) label.textContent = 'Uniform size';
        return;
    }

    normalizedOptions.forEach(col => {
        const option = document.createElement('option');
        option.value = col.id;
        option.textContent = col.name;
        select.appendChild(option);
    });

    const selectedOption = normalizedOptions.find(col => col.id === desiredColumn) || normalizedOptions[0];
    select.value = selectedOption?.id ?? normalizedOptions[0].id;
    select.disabled = !enabled;

    if (label) {
        label.textContent = enabled && selectedOption
            ? `Scale by ${selectedOption.name}`
            : 'Uniform size';
    }
}