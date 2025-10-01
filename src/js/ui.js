import { highlightNodeById } from './render.js';
import * as layoutManager from './layoutManager.js';

// --- DYNAMIC FILTER/STYLE CONSTANTS ---
const NODE_COLUMNS = [
    // Core properties
    { id: 'Name', name: 'Name', type: 'text' },
    { id: 'Type', name: 'Type', type: 'text' },
    { id: 'SubType', name: 'Sub Type', type: 'text' },
    { id: 'Execution', name: 'Execution', type: 'text' },
    { id: 'Platform', name: 'Platform', type: 'text' },
    { id: 'Description', name: 'Description', type: 'text' },
    
    // Organizational properties
    { id: 'AOR', name: 'Area of Responsibility', type: 'text' },
    { id: 'Account', name: 'Account', type: 'text' },
    { id: 'Monitoring', name: 'Monitoring', type: 'text' },
    { id: 'MonitoredData', name: 'Monitored Data', type: 'text' },
    { id: 'KPI', name: 'KPI', type: 'text' },
    
    // Cost and volume properties
    { id: 'AvgCost', name: 'Average Cost', type: 'number' },
    { id: 'costValue', name: 'Cost Value', type: 'number' },
    { id: 'Effective Cost', name: 'Effective Cost', type: 'number' },
    { id: 'incomingVolume', name: 'Incoming Volume', type: 'number' },
    { id: 'IncomingNumber', name: 'Incoming Number', type: 'number' },
    { id: 'Variable', name: 'Variable', type: 'number' },
    
    // Time and scheduling properties
    { id: 'AvgCostTime', name: 'Average Cost Time', type: 'text' },
    { id: 'LastUpdate', name: 'Last Update', type: 'text' },
    { id: 'NextUpdate', name: 'Next Update', type: 'text' },
    { id: 'ScheduleStart', name: 'Schedule Start', type: 'text' },
    { id: 'ScheduleEnd', name: 'Schedule End', type: 'text' },
    { id: 'Frequency', name: 'Frequency', type: 'text' }
];

const CONNECTION_COLUMNS = [
    // Direct connection properties
    { id: 'source', name: 'Source ID', type: 'text' },
    { id: 'target', name: 'Target ID', type: 'text' },
    { id: 'type', name: 'Connection Type', type: 'text' },
    
    // Source node properties
    { id: 'source.Name', name: 'Source Name', type: 'text' },
    { id: 'source.Type', name: 'Source Type', type: 'text' },
    { id: 'source.SubType', name: 'Source Sub Type', type: 'text' },
    { id: 'source.Execution', name: 'Source Execution', type: 'text' },
    { id: 'source.Platform', name: 'Source Platform', type: 'text' },
    { id: 'source.AOR', name: 'Source Area of Responsibility', type: 'text' },
    { id: 'source.Account', name: 'Source Account', type: 'text' },
    { id: 'source.Monitoring', name: 'Source Monitoring', type: 'text' },
    
    // Target node properties
    { id: 'target.Name', name: 'Target Name', type: 'text' },
    { id: 'target.Type', name: 'Target Type', type: 'text' },
    { id: 'target.SubType', name: 'Target Sub Type', type: 'text' },
    { id: 'target.Execution', name: 'Target Execution', type: 'text' },
    { id: 'target.Platform', name: 'Target Platform', type: 'text' },
    { id: 'target.AOR', name: 'Target Area of Responsibility', type: 'text' },
    { id: 'target.Account', name: 'Target Account', type: 'text' },
    { id: 'target.Monitoring', name: 'Target Monitoring', type: 'text' },
];

const OPERATORS = {
    text: [
        { id: 'contains', name: 'contains' },
        { id: 'not_contains', name: 'does not contain' },
        { id: 'equals', name: 'equals' },
        { id: 'not_equals', name: 'does not equal' },
    ],
    number: [
        { id: 'gt', name: '>' },
        { id: 'lt', name: '<' },
        { id: 'eq', name: '=' },
    ]
};


/**
 * Adds a new filter rule to the UI.
 * @param {function} onChange - Callback function to trigger when the rule changes.
 */
export function addFilterRule(onChange) {
    const container = document.getElementById('filter-rules-container');
    const ruleEl = document.createElement('div');
    ruleEl.className = 'filter-rule';

    ruleEl.innerHTML = `
        <select class="form-control form-control--sm column-select">
            <option value="">-- Select Column --</option>
            <optgroup label="Nodes">
                ${NODE_COLUMNS.map(c => `<option value="node:${c.id}">${c.name}</option>`).join('')}
            </optgroup>
            <optgroup label="Connections">
                ${CONNECTION_COLUMNS.map(c => `<option value="connection:${c.id}">${c.name}</option>`).join('')}
            </optgroup>
        </select>
        <select class="form-control form-control--sm operator-select" disabled></select>
        <input type="text" class="form-control form-control--sm value-input" disabled placeholder="Value">
        <button class="btn btn--danger btn--sm remove-rule-btn">&times;</button>
    `;

    container.appendChild(ruleEl);

    const columnSelect = ruleEl.querySelector('.column-select');
    const operatorSelect = ruleEl.querySelector('.operator-select');
    const valueInput = ruleEl.querySelector('.value-input');

    columnSelect.addEventListener('change', () => {
        const selectedOption = columnSelect.value;
        const [scope, columnId] = selectedOption.split(':');
        const columns = scope === 'node' ? NODE_COLUMNS : CONNECTION_COLUMNS;
        const column = columns.find(c => c.id === columnId);

        operatorSelect.innerHTML = '';
        if (column) {
            const ops = OPERATORS[column.type] || OPERATORS.text;
            ops.forEach(op => {
                const option = document.createElement('option');
                option.value = op.id;
                option.textContent = op.name;
                operatorSelect.appendChild(option);
            });
            operatorSelect.disabled = false;
            valueInput.disabled = false;
        } else {
            operatorSelect.disabled = true;
            valueInput.disabled = true;
        }
        onChange();
    });

    operatorSelect.addEventListener('change', onChange);
    valueInput.addEventListener('input', onChange);

    ruleEl.querySelector('.remove-rule-btn').addEventListener('click', () => {
        ruleEl.remove();
        onChange();
    });
}

/**
 * Adds a new styling rule to the UI.
 * @param {function} onChange - Callback function to trigger when the rule changes.
 */
export function addStylingRule(onChange) {
    const container = document.getElementById('styling-rules-container');
    const ruleEl = document.createElement('div');
    ruleEl.className = 'styling-rule';

    ruleEl.innerHTML = `
        <div class="rule-condition">
            If
            <select class="form-control form-control--sm column-select">
                <option value="">-- Select Column --</option>
                <optgroup label="Nodes">
                    ${NODE_COLUMNS.map(c => `<option value="node:${c.id}">${c.name}</option>`).join('')}
                </optgroup>
                <optgroup label="Connections">
                    ${CONNECTION_COLUMNS.map(c => `<option value="connection:${c.id}">${c.name}</option>`).join('')}
                </optgroup>
            </select>
            <select class="form-control form-control--sm operator-select" disabled></select>
            <input type="text" class="form-control form-control--sm value-input" disabled placeholder="Value">
        </div>
        <div class="rule-style">
            Then set
            <input type="color" class="form-control form-control--sm color-input" title="Color" value="${getThemeAppropriateColor()}">
            <input type="number" class="form-control form-control--sm stroke-width-input" placeholder="Stroke Width" min="1" max="10">
            <button class="btn btn--danger btn--sm remove-rule-btn">&times;</button>
        </div>
    `;

    container.appendChild(ruleEl);

    const columnSelect = ruleEl.querySelector('.column-select');
    const operatorSelect = ruleEl.querySelector('.operator-select');
    const valueInput = ruleEl.querySelector('.value-input');

    columnSelect.addEventListener('change', () => {
        const selectedOption = columnSelect.value;
        const [scope, columnId] = selectedOption.split(':');
        const columns = scope === 'node' ? NODE_COLUMNS : CONNECTION_COLUMNS;
        const column = columns.find(c => c.id === columnId);

        operatorSelect.innerHTML = '';
        if (column) {
            const ops = OPERATORS[column.type] || OPERATORS.text;
            ops.forEach(op => {
                const option = document.createElement('option');
                option.value = op.id;
                option.textContent = op.name;
                operatorSelect.appendChild(option);
            });
            operatorSelect.disabled = false;
            valueInput.disabled = false;
        } else {
            operatorSelect.disabled = true;
            valueInput.disabled = true;
        }
        onChange();
    });

    ruleEl.querySelectorAll('select, input').forEach(input => {
        input.addEventListener('change', onChange);
        if(input.type === 'text' || input.type === 'number') {
            input.addEventListener('input', onChange);
        }
    });

    ruleEl.querySelector('.remove-rule-btn').addEventListener('click', () => {
        ruleEl.remove();
        onChange();
    });
}

/**
 * Gets the current filter mode from the UI.
 * @returns {string} Either 'highlight' or 'exclude'
 */
export function getFilterMode() {
    const checkedRadio = document.querySelector('input[name="filter-mode"]:checked');
    return checkedRadio ? checkedRadio.value : 'highlight';
}

/**
 * Gathers all active filter rules from the UI.
 * @returns {Array<object>} An array of filter rule objects.
 */
export function getFilterRules() {
    const rules = [];
    document.querySelectorAll('#filter-rules-container .filter-rule').forEach(ruleEl => {
        const column = ruleEl.querySelector('.column-select').value;
        const operator = ruleEl.querySelector('.operator-select').value;
        const value = ruleEl.querySelector('.value-input').value;

        if (column && operator && value) {
            const [scope, columnId] = column.split(':');
            rules.push({ scope, column: columnId, operator, value });
        }
    });
    return rules;
}


/**
 * Gathers all active styling rules from the UI.
 * @returns {Array<object>} An array of styling rule objects.
 */
export function getStylingRules() {
    const rules = [];
    document.querySelectorAll('#styling-rules-container .styling-rule').forEach(ruleEl => {
        const column = ruleEl.querySelector('.column-select').value;
        const operator = ruleEl.querySelector('.operator-select').value;
        const value = ruleEl.querySelector('.value-input').value;
        const color = ruleEl.querySelector('.color-input').value;
        const strokeWidth = ruleEl.querySelector('.stroke-width-input').value;

        if (column && operator && value) {
            const [scope, columnId] = column.split(':');
            const rule = {
                scope,
                condition: { column: columnId, operator, value },
                style: {
                    color: color || null,
                    strokeWidth: strokeWidth ? parseInt(strokeWidth) : null,
                }
            };
            rules.push(rule);
        }
    });
    return rules;
}

/**
 * Binds all the UI event listeners to their respective DOM elements.
 * @param {object} handlers - An object containing the handler functions.
 */
export function bindEventListeners(handlers) {
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
    
    // Initialize theme
    initializeTheme();
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
 * Shows the details panel with information about the selected node.
 * @param {object} node - The data object for the selected node.
 */
export function showNodeDetails(node) {
    // Repurposed: ensure the editor sidebar is visible, switch to Nodes tab, and highlight the row.
    const panel = document.getElementById('detailsPanel');
    if (panel) panel.classList.remove('hidden');

    // Simple tab handling: show Nodes section and hide others
    const nodesSection = document.getElementById('nodes-section');
    const connsSection = document.getElementById('connections-section');
    const varsSection = document.getElementById('variables-section');
    nodesSection?.removeAttribute('hidden');
    connsSection?.setAttribute('hidden', 'true');
    varsSection?.setAttribute('hidden', 'true');

    // Try to highlight the node in the Nodes table
    try { highlightTableRowByNodeId(node.id); } catch (_) { /* noop */ }
}

/**
 * Hides the details panel.
 */
export function hideDetailsPanel() {
    const panel = document.getElementById('detailsPanel');
    const showBtn = document.getElementById('showEditorBtn');
    if (!panel) return;
    
    // Toggle the hidden state
    const isHidden = panel.classList.toggle('hidden');
    
    // Update close button text to indicate current state
    const closeBtn = document.getElementById('closePanelBtn');
    if (closeBtn) {
        closeBtn.innerHTML = isHidden ? '↑' : '×';
        closeBtn.title = isHidden ? 'Show Editor Panel' : 'Hide Editor Panel';
    }
    
    // Toggle floating show button
    if (showBtn) {
        if (isHidden) {
            showBtn.classList.remove('hidden');
        } else {
            showBtn.classList.add('hidden');
        }
    }
    
    // Trigger a resize event to ensure the visualization adjusts to the new space
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

/**
 * Toggles the visibility of the main controls panel.
 */
export function toggleControlsPanel() {
    const panel = document.getElementById('controlsPanel');
    if (!panel) return;
    panel.classList.toggle('collapsed');
    
    // Trigger a resize event to ensure the visualization adjusts to the new space
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 300); // Wait for CSS transition to complete
}

/**
 * Toggles between light and dark theme.
 */
export function toggleTheme() {
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    
    // Update button icon and tooltip
    if (themeToggle) {
        themeToggle.textContent = newTheme === 'dark' ? 'Light' : 'Dark';
        themeToggle.title = `Switch to ${newTheme === 'dark' ? 'Light' : 'Dark'} Theme`;
    }
    
    // Update color inputs for current theme
    updateColorInputDefaults();
    
    // Save theme preference
    localStorage.setItem('theme', newTheme);
    
    // Update any color inputs to use theme-appropriate defaults
    updateColorInputDefaults();
}

/**
 * Updates color input default values based on current theme.
 */
function updateColorInputDefaults() {
    const theme = document.documentElement.getAttribute('data-theme');
    const colorInputs = document.querySelectorAll('.color-input');
    
    colorInputs.forEach(input => {
        const currentColor = input.value;
        
        // Auto-fix problematic colors for current theme
        if (theme === 'dark' && (currentColor === '#000000' || currentColor === '' || !currentColor)) {
            input.value = '#60a5fa';
        } else if (theme === 'light' && currentColor === '#ffffff') {
            input.value = '#3b82f6';
        }
    });
}

/**
 * Gets a theme-appropriate default color for styling rules.
 */
function getThemeAppropriateColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? '#60a5fa' : '#3b82f6';
}

/**
 * Initializes the theme based on user preference or system preference.
 */
export function initializeTheme() {
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    
    // Get saved theme or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || systemTheme;
    
    html.setAttribute('data-theme', theme);
    
    // Update button icon and tooltip
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? 'd' : 'l';
        themeToggle.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`;
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            if (themeToggle) {
                themeToggle.textContent = newTheme === 'dark' ? 'l' : 'd';
                themeToggle.title = `Switch to ${newTheme === 'dark' ? 'Light' : 'Dark'} Theme`;
            }
        }
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
    document.getElementById('filter-rules-container').innerHTML = '';
    document.getElementById('styling-rules-container').innerHTML = '';
    document.getElementById('layoutSelect').value = 'force';
    document.getElementById('sizeToggle').checked = true;
    toggleGridControls(false);
    updateGridUI(false);
}

// --- Table Editors (Handsontable) ---
let _nodesHot = null;
let _connectionsHot = null;
let _variablesHot = null;
let _debounceTimers = { nodes: null, connections: null, variables: null };
// Track selection state for table highlighting (used by Handsontable cells() callbacks)
let _selectedRowIds = new Set();
// Track currently active table to route keyboard undo/redo
let _activeHot = null;

function debounceTable(type, fn, delay = 200) {
    clearTimeout(_debounceTimers[type]);
    _debounceTimers[type] = setTimeout(() => fn(), delay);
}

/**
 * Initialize Handsontable editors for Nodes, Connections, and Variables.
 * Expects a `core` object exposing: nodes, connections, variables, and
 * methods: updateFromTable(type, data), resolveVariables(), computeDerivedFields(), updateVisualization().
 * @param {object} core
 */
export async function initEditorTables(core) {
    const elementsEl = document.getElementById('nodes-table'); // Keep same DOM ID for now
    const connsEl = document.getElementById('connections-table');
    const varsEl = document.getElementById('variables-table');
    if (!elementsEl || !connsEl || !varsEl) return;

    // Lazy import to avoid breaking if dependency not yet installed
    let Handsontable;
    try {
        Handsontable = (await import('handsontable')).default;
    } catch (e) {
        elementsEl.innerHTML = '<div style="padding:8px;">Handsontable not installed. Run: npm i handsontable</div>';
        connsEl.innerHTML = '';
        varsEl.innerHTML = '';
        return;
    }

    const baseSettings = {
        licenseKey: 'non-commercial-and-evaluation',
        rowHeaders: true,
        height: '100%', // Stretch to container
        width: '100%',
        contextMenu: true,
    undoRedo: true,
        minSpareRows: 1,
        hiddenColumns: true, // Enable plugin
        manualColumnResize: true, // Allow user resizing
    };

    // Elements table (formerly nodes)
    const elementTypes = ['Resource', 'Action', 'State', 'Decision'];
    const executionTypes = ['Automatic', 'Manual', 'Applicant', 'Noemie', 'Gil'];
    const subTypes = ['Job Portal', 'Form Incoming', 'SMS', 'Call', 'Mail', 'Video Incoming', 'Out', 'Checkpoint', 'State'];
    _nodesHot = new Handsontable(elementsEl, {
        ...baseSettings,
        data: (core.elements || core.nodes || []).map(e => ({ ...e })),
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'name', title: 'Name' },
            { data: 'incomingNumber', title: 'Incoming Number' },
            { data: 'variable', title: 'Variable', type: 'numeric', numericFormat: { pattern: '0[.]000' } },
            { data: 'type', title: 'Type', type: 'dropdown', source: elementTypes },
            { data: 'subType', title: 'Sub Type', type: 'dropdown', source: subTypes },
            { data: 'aOR', title: 'AOR' },
            { data: 'execution', title: 'Execution', type: 'dropdown', source: executionTypes },
            { data: 'account', title: 'Account' },
            { data: 'platform', title: 'Platform' },
            { data: 'monitoring', title: 'Monitoring' },
            { data: 'monitoredData', title: 'Monitored Data' },
            { data: 'description', title: 'Description' },
            { data: 'avgCostTime', title: 'Avg Cost Time' },
            { data: 'avgCost', title: 'Avg Cost', type: 'numeric', numericFormat: { pattern: '0[.]00' } },
            { data: 'effectiveCost', title: 'Effective Cost', type: 'numeric', numericFormat: { pattern: '0[.]00' } },
            { data: 'lastUpdate', title: 'Last Update' },
            { data: 'nextUpdate', title: 'Next Update' },
            { data: 'kPI', title: 'KPI' },
            { data: 'scheduleStart', title: 'Schedule Start' },
            { data: 'scheduleEnd', title: 'Schedule End' },
            { data: 'frequency', title: 'Frequency' }
        ],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData') return;
            console.log('🔄 Elements table changed:', changes, 'source:', source);
            debounceTable('elements', () => {
                console.log('📝 Processing elements table changes...');
                const nextElements = _nodesHot.getSourceData().map(r => ({
                    id: String(r.id || '').trim(),
                    name: String(r.name || '').trim(),
                    incomingNumber: String(r.incomingNumber || '').trim(),
                    variable: typeof r.variable === 'number' ? r.variable : parseFloat(r.variable) || 1.0,
                    type: String(r.type || '').trim(),
                    subType: String(r.subType || '').trim(),
                    aOR: String(r.aOR || '').trim(),
                    execution: String(r.execution || 'Manual').trim(),
                    account: String(r.account || '').trim(),
                    platform: String(r.platform || '').trim(),
                    monitoring: String(r.monitoring || '').trim(),
                    monitoredData: String(r.monitoredData || '').trim(),
                    description: String(r.description || '').trim(),
                    avgCostTime: String(r.avgCostTime || '').trim(),
                    avgCost: typeof r.avgCost === 'number' ? r.avgCost : parseFloat(r.avgCost) || 0,
                    effectiveCost: typeof r.effectiveCost === 'number' ? r.effectiveCost : parseFloat(r.effectiveCost) || 0,
                    lastUpdate: String(r.lastUpdate || '').trim(),
                    nextUpdate: String(r.nextUpdate || '').trim(),
                    kPI: String(r.kPI || '').trim(),
                    scheduleStart: String(r.scheduleStart || '').trim(),
                    scheduleEnd: String(r.scheduleEnd || '').trim(),
                    frequency: String(r.frequency || '').trim()
                })).filter(e => e.id);
                console.log('🚀 Calling updateFromTable with:', nextElements.length, 'elements');
                core.updateFromTable('elements', nextElements);
                // Refresh connection dropdown sources with updated element IDs
                if (_connectionsHot) {
                    const elementIds = (core.elements || core.nodes || []).map(e => e.id);
                    _connectionsHot.updateSettings({
                        columns: [
                            { data: 'id', title: 'ID' },
                            { data: 'fromId', title: 'From', type: 'dropdown', source: elementIds },
                            { data: 'toId', title: 'To', type: 'dropdown', source: elementIds },
                            { data: 'probability', title: 'Probability' },
                            { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
                            { data: 'description', title: 'Description' }
                        ]
                    });
                }
            });
        }
    });

    // Connections table
    const elementIds = (core.elements || core.nodes || []).map(e => e.id);
    _connectionsHot = new Handsontable(connsEl, {
        ...baseSettings,
        data: core.connections.map(c => ({ ...c })),
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'fromId', title: 'From', type: 'dropdown', source: elementIds },
            { data: 'toId', title: 'To', type: 'dropdown', source: elementIds },
            { data: 'probability', title: 'Probability' },
            { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
            { data: 'description', title: 'Description' }
        ],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData') return;
            console.log('🔄 Connections table changed:', changes, 'source:', source);
            debounceTable('connections', () => {
                console.log('📝 Processing connections table changes...');
                const nextConns = _connectionsHot.getSourceData().map(r => ({
                    id: String(r.id || `${r.fromId || ''}->${r.toId || ''}`).trim(),
                    fromId: String(r.fromId || '').trim(),
                    toId: String(r.toId || '').trim()
                })).filter(c => c.fromId && c.toId);
                console.log('🚀 Calling updateFromTable with:', nextConns.length, 'connections');
                core.updateFromTable('connections', nextConns);
            });
        }
    });

    _connectionsHot.addHook('afterOnCellMouseDown', () => setActiveHot(_connectionsHot));

    // Variables table (object <-> rows of {key, value})
    const toVarRows = (vars) => Object.entries(vars || {}).map(([key, value]) => ({ key, value }));
    const fromVarRows = (rows) => {
        const o = {};
        (rows || []).forEach(r => {
            const k = String(r.key || '').trim();
            if (!k) return;
            const num = typeof r.value === 'number' ? r.value : parseFloat(r.value);
            if (!Number.isNaN(num)) o[k] = num;
        });
        return o;
    };

    _variablesHot = new Handsontable(varsEl, {
        ...baseSettings,
        data: toVarRows(core.variables),
        columns: [
            { data: 'key', title: 'Key' },
            { data: 'value', title: 'Value', type: 'numeric', numericFormat: { pattern: '0[.]000' } }
        ],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData') return;
            debounceTable('variables', () => {
                const kv = fromVarRows(_variablesHot.getSourceData());
                core.updateFromTable('variables', kv);
            });
        }
    });

    // Configure cell-level highlighting with custom renderers to explicitly add/remove classes
    const applyCellsHighlighting = () => {
        const TextRenderer = Handsontable.renderers.TextRenderer;
        if (_nodesHot) {
            _nodesHot.updateSettings({
                cells(row, col) {
                    return {
                        renderer(instance, td, r, c, prop, value, cellProperties) {
                            TextRenderer.apply(this, arguments);
                            const dataRow = instance.getSourceDataAtRow(r);
                            const sel = dataRow && _selectedRowIds.has(String(dataRow.id || ''));
                            td.classList.toggle('is-selected', !!sel);
                        }
                    };
                }
            }, false);
        }
        if (_connectionsHot) {
            _connectionsHot.updateSettings({
                cells(row, col) {
                    return {
                        renderer(instance, td, r, c, prop, value, cellProperties) {
                            TextRenderer.apply(this, arguments);
                            const dataRow = instance.getSourceDataAtRow(r);
                            const fromId = String(dataRow?.fromId || '');
                            const toId = String(dataRow?.toId || '');
                            const sel = (fromId && _selectedRowIds.has(fromId)) || (toId && _selectedRowIds.has(toId));
                            td.classList.toggle('is-selected', !!sel);
                        }
                    };
                }
            }, false);
        }
    };
    applyCellsHighlighting();

    // Wire Save to Server button
    const saveToServerBtn = document.getElementById('save-to-server');
    if (saveToServerBtn) {
        saveToServerBtn.onclick = async () => {
            const { saveToFiles } = await import('./fileManager.js');
            const success = await saveToFiles(core.elements || core.nodes, core.connections, core.variables);
            
            const statusMsg = success 
                ? '✅ Saved to server!' 
                : '⚠️ Server unavailable';
            
            // Show status temporarily
            saveToServerBtn.textContent = statusMsg;
            saveToServerBtn.style.backgroundColor = success ? '#28a745' : '#dc3545';
            
            setTimeout(() => {
                saveToServerBtn.textContent = '💾 Save to Server';
                saveToServerBtn.style.backgroundColor = '';
            }, 2000);
        };
    }

    // Wire Export Data button (downloads JSON files for backup/sharing)
    const exportDataBtn = document.getElementById('export-data');
    if (exportDataBtn) {
        exportDataBtn.onclick = async () => {
            const { downloadJsonFile } = await import('./utils.js');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            
            // Download individual files
            downloadJsonFile(core.elements || [], `elements_${timestamp}.json`);
            downloadJsonFile(core.connections || [], `connections_${timestamp}.json`);
            downloadJsonFile(core.variables || {}, `variables_${timestamp}.json`);
            
            // Download combined file
            const combined = {
                elements: core.elements || [],
                connections: core.connections || [],
                variables: core.variables || {},
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            downloadJsonFile(combined, `workflow_${timestamp}.json`);
            
            // Show status temporarily
            exportDataBtn.textContent = '✅ Downloaded!';
            exportDataBtn.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                exportDataBtn.textContent = '📤 Export Data';
                exportDataBtn.style.backgroundColor = '';
            }, 2000);
        };
    }

    // Set active table on click and handle graph highlighting
    _nodesHot.addHook('afterOnCellMouseDown', (event, coords) => {
        setActiveHot(_nodesHot);
        const row = coords?.row;
        if (row == null || row < 0) return;
        const data = _nodesHot.getSourceDataAtRow(row);
        if (data && data.id) {
            try {
                highlightNodeById(data.id);
            } catch (_) { /* ignore */ }
        }
    });
    _connectionsHot.addHook('afterOnCellMouseDown', () => setActiveHot(_connectionsHot));
    _variablesHot.addHook('afterOnCellMouseDown', () => setActiveHot(_variablesHot));

    const setActiveHot = (hotInstance) => {
        _activeHot = hotInstance;
    };
    // Default active table
    _activeHot = _nodesHot;

    // Add Row: insert into the active table
    const addRowBtn = document.getElementById('add-row');
    if (addRowBtn) {
        addRowBtn.onclick = () => {
            if (!_activeHot) return;
            const rows = _activeHot.countRows();
            const spareRows = _activeHot.getSettings().minSpareRows;
            const targetRow = rows > spareRows ? rows - spareRows : rows;

            _activeHot.alter('insert_row_below', targetRow, 1);
            _activeHot.selectCell(targetRow + 1, 0);
        };
    }

    // All tables are created, now initialize interactions
    initUIInteractions();
    loadUIPrefs(); // Load saved sizes on startup

    // Ensure Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z work inside tables even if global listeners exist
    document.addEventListener('keydown', (e) => {
        const insideHot = e.target && typeof e.target.closest === 'function' && e.target.closest('.handsontable');
        if (!insideHot) return;
        const isZ = e.key === 'z' || e.key === 'Z';
        if (!isZ || !_activeHot) return;
        const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey;
        const isRedo = (e.metaKey || e.ctrlKey) && e.shiftKey;
        if (isUndo) {
            e.preventDefault();
            e.stopPropagation();
            try { _activeHot.undo(); } catch (_) { /* noop */ }
        } else if (isRedo) {
            e.preventDefault();
            e.stopPropagation();
            try { _activeHot.redo(); } catch (_) { /* noop */ }
        }
    }, true);
}

/**
 * Show the Variables section (placeholder until tab interactions are added).
 */
export function showVariablesUI() {
    document.getElementById('nodes-section')?.setAttribute('hidden', 'true');
    document.getElementById('connections-section')?.setAttribute('hidden', 'true');
    const v = document.getElementById('variables-section');
    if (v) v.removeAttribute('hidden');
}

/**
 * Highlight the row in the Nodes table that matches the given nodeId and scroll it into view.
 * @param {string} nodeId
 */
export function highlightTableRowByNodeId(nodeId) {
    try {
        if (!_nodesHot) return;
        const data = _nodesHot.getSourceData();
        const idx = data.findIndex(r => String(r.id) === String(nodeId));
        if (idx >= 0) {
            // Select the first VISIBLE column to avoid jump issues when the first column is hidden
            const hiddenPlugin = _nodesHot.getPlugin('hiddenColumns');
            const cols = _nodesHot.getSettings()?.columns || [];
            const hidden = hiddenPlugin?.getHiddenColumns?.() || [];
            let firstVisibleCol = 0;
            for (let c = 0; c < cols.length; c++) {
                if (!hidden.includes(c)) { firstVisibleCol = c; break; }
            }
            _nodesHot.selectCell(idx, firstVisibleCol, idx, firstVisibleCol, true, true);
            // Add a temporary CSS class to visualize hover/focus without clearing multi-selection
            const trs = _nodesHot.rootElement.querySelectorAll('tbody tr');
            trs.forEach(tr => tr.classList.remove('is-hovered'));
            const tr = trs[idx];
            if (tr) {
                tr.classList.add('is-hovered');
                tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    } catch(_) { /* noop */ }
}

/**
 * Clears transient hover/focus highlight from the Elements table.
 */
export function clearTableRowHoverHighlight() {
    try {
        if (!_nodesHot) return;
        const trs = _nodesHot.rootElement.querySelectorAll('tbody tr');
        trs.forEach(tr => tr.classList.remove('is-hovered'));
    } catch (_) { /* noop */ }
}

/**
 * Updates row highlights in the Elements and Connections tables based on a Set of selected node IDs.
 * Elements whose id is in the set are marked selected; connections where either endpoint is in the set are marked selected.
 * @param {Set<string>} selectedNodeIds
 */
export function updateTableSelectionHighlights(selectedNodeIds) {
    // Replace selection set and re-render; cells() callback applies per-cell classes
    _selectedRowIds = new Set(Array.from(selectedNodeIds || []));
    if (_nodesHot) _nodesHot.render();
    if (_connectionsHot) _connectionsHot.render();
    // Ensure any transient hover is cleared if it doesn’t match selection anymore
    clearTableRowHoverHighlight();
}

/**
 * Refresh existing Handsontable instances with new data without re-initializing.
 * Keeps event handlers and DOM intact.
 */
export function refreshEditorData(core) {
    console.log('🔄 Refreshing editor data with:', {
        elements: (core.elements || core.nodes || []).length,
        connections: (core.connections || []).length,
        variables: Object.keys(core.variables || {}).length
    });

    if (_nodesHot) {
        _nodesHot.loadData((core.elements || core.nodes || []).map(e => ({ ...e })));
    }
    if (_connectionsHot) {
        const elementIds = (core.elements || core.nodes || []).map(e => e.id);
        _connectionsHot.updateSettings({
            columns: [
                { data: 'id', title: 'ID' },
                { data: 'fromId', title: 'From', type: 'dropdown', source: elementIds },
                { data: 'toId', title: 'To', type: 'dropdown', source: elementIds },
                { data: 'probability', title: 'Probability' },
                { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
                { data: 'description', title: 'Description' }
            ]
        }, false);
        _connectionsHot.loadData(core.connections.map(c => ({ ...c })));
    }
    if (_variablesHot) {
        const toVarRows = (vars) => Object.entries(vars || {}).map(([key, value]) => ({ key, value }));
        _variablesHot.loadData(toVarRows(core.variables));
    }

    // Simple resize handler
    window.addEventListener('resize', () => {
        setTimeout(() => {
            [_nodesHot, _connectionsHot, _variablesHot].forEach(hot => {
                if (hot) hot.render();
            });
        }, 100);
    });
}

function initUIInteractions() {
    initResizers();
    initColumnToggles();
    initMaximizeButtons();
}

// --- UI Preferences ---

/**
 * Saves the current UI preferences (panel/column states) to localStorage.
 */
function saveUIPrefs() {
    const getHiddenCols = (hotInstance) => {
        if (!hotInstance) return [];
        const plugin = hotInstance.getPlugin('hiddenColumns');
        return plugin && Array.isArray(plugin.getHiddenColumns()) ? plugin.getHiddenColumns() : [];
    };

    const prefs = {
        detailsPanelWidth: document.getElementById('detailsPanel').style.width,
        elementsTableFlexBasis: document.getElementById('elements-table-container').style.flexBasis,
        connectionsTableFlexBasis: document.getElementById('connections-table-container').style.flexBasis,
        variablesTableFlexBasis: document.getElementById('variables-table-container').style.flexBasis,
        hidden_elements: getHiddenCols(_nodesHot),
        hidden_connections: getHiddenCols(_connectionsHot),
        hidden_variables: getHiddenCols(_variablesHot),
    };
    console.log('[Prefs] Saving preferences:', prefs);
    localStorage.setItem('workflowUIPrefs', JSON.stringify(prefs));
}

/**
 * Loads and applies UI preferences from localStorage.
 */
function loadUIPrefs() {
    const prefsString = localStorage.getItem('workflowUIPrefs');
    console.log('[Prefs] Loading preferences string:', prefsString);
    if (!prefsString) {
        console.log('[Prefs] No preferences found.');
        return;
    }

    const prefs = JSON.parse(prefsString);
    console.log('[Prefs] Applying loaded preferences:', prefs);

    // Restore panel sizes
    if (prefs.detailsPanelWidth) {
        document.getElementById('detailsPanel').style.width = prefs.detailsPanelWidth;
    }
    if (prefs.elementsTableFlexBasis) {
        document.getElementById('elements-table-container').style.flexBasis = prefs.elementsTableFlexBasis;
    }
    if (prefs.connectionsTableFlexBasis) {
        document.getElementById('connections-table-container').style.flexBasis = prefs.connectionsTableFlexBasis;
    }
    if (prefs.variablesTableFlexBasis) {
        document.getElementById('variables-table-container').style.flexBasis = prefs.variablesTableFlexBasis;
    }

    // Restore hidden columns
    const setHiddenCols = (hotInstance, key) => {
        if (hotInstance && prefs[key] && Array.isArray(prefs[key])) {
            const plugin = hotInstance.getPlugin('hiddenColumns');
            if (plugin) {
                setTimeout(() => {
                    plugin.hideColumns(prefs[key]);
                    hotInstance.render();
                }, 100);
            }
        }
    };

    setHiddenCols(_nodesHot, 'hidden_elements');
    setHiddenCols(_connectionsHot, 'hidden_connections');
    setHiddenCols(_variablesHot, 'hidden_variables');
}

/**
 * Initializes the "Columns" buttons to toggle column visibility popups.
 */
function initColumnToggles() {
    const hotInstances = {
        elements: _nodesHot,
        connections: _connectionsHot,
        variables: _variablesHot,
    };

    document.querySelectorAll('[data-action="toggle-columns"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const tableName = button.dataset.table;
            const hot = hotInstances[tableName];
            const popup = document.querySelector(`.column-toggle-popup[data-table="${tableName}"]`);

            if (!hot || !popup) return;

            // Hide other popups
            document.querySelectorAll('.column-toggle-popup').forEach(p => {
                if (p !== popup) p.style.display = 'none';
            });

            // Toggle current popup's visibility
            if (popup.style.display === 'block') {
                popup.style.display = 'none';
                return;
            }

            // Populate popup with columns
            popup.innerHTML = '';
            const hiddenPlugin = hot.getPlugin('hiddenColumns');
            const allCols = hot.getSettings().columns;
            const hiddenCols = hiddenPlugin.getHiddenColumns() || [];

            if (!Array.isArray(allCols)) {
                return;
            }

            allCols.forEach((col, index) => {
                const isHidden = hiddenCols.includes(index);
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !isHidden;
                checkbox.dataset.colIndex = index;

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(` ${col.title}`));

                checkbox.addEventListener('change', () => {
                    const colIndex = parseInt(checkbox.dataset.colIndex, 10);
                    if (checkbox.checked) {
                        hiddenPlugin.showColumn(colIndex);
                    } else {
                        hiddenPlugin.hideColumn(colIndex);
                    }
                    hot.render();
                    saveUIPrefs();
                });

                popup.appendChild(label);
            });

            // Position and show popup
            const btnRect = button.getBoundingClientRect();
            popup.style.display = 'block';
            popup.style.top = `${btnRect.bottom + 2}px`;
            popup.style.right = `${window.innerWidth - btnRect.right}px`;

            // Prevent clicks inside the popup from closing it
            popup.addEventListener('click', (e) => e.stopPropagation());
        });
    });

    // Close popups when clicking elsewhere
    window.addEventListener('click', () => {
        document.querySelectorAll('.column-toggle-popup').forEach(p => p.style.display = 'none');
    });
}

/**
 * Initializes the maximize/minimize buttons for each table container.
 */
function initMaximizeButtons() {
    document.querySelectorAll('[data-action="toggle-maximize"]').forEach(button => {
        button.addEventListener('click', () => {
            const tableName = button.dataset.table;
            const targetContainer = document.getElementById(`${tableName}-table-container`);
            if (!targetContainer) return;

            const isMaximized = targetContainer.classList.contains('maximized');

            // Reset all first
            document.querySelectorAll('.table-container').forEach(c => {
                c.classList.remove('maximized', 'hidden');
            });
            document.querySelectorAll('[data-action="toggle-maximize"]').forEach(b => {
                b.textContent = '⛶'; // Restore maximize icon
            });

            if (!isMaximized) {
                // Maximize the target
                targetContainer.classList.add('maximized');
                button.textContent = '❐'; // Change to minimize icon
                // Hide others
                document.querySelectorAll('.table-container').forEach(c => {
                    if (c !== targetContainer) {
                        c.classList.add('hidden');
                    }
                });
            }
            // If it was maximized, the reset above is all that's needed.

            // Re-render all tables to adjust to new dimensions
            setTimeout(() => {
                [_nodesHot, _connectionsHot, _variablesHot].forEach(hot => {
                    if (hot) hot.render();
                });
            }, 50); // Small delay for layout to update
        });
    });
}

/**
 * Initializes all resizer elements (horizontal and vertical).
 */
function initResizers() {
    // Horizontal resizer for the main details panel
    const panel = document.getElementById('detailsPanel');
    const panelResizer = document.getElementById('panelResizer');
    if (panel && panelResizer) {
        let startX = 0;
        let startWidth = 0;
        const onMove = (e) => {
            const dx = e.clientX - startX;
            const newW = Math.max(320, startWidth - dx);
            panel.style.width = newW + 'px';
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            saveUIPrefs();
        };
        panelResizer.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startWidth = panel.getBoundingClientRect().width;
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    }

    // Vertical resizers for tables
    document.querySelectorAll('.vertical-resizer').forEach(resizer => {
        let startY, prevElement, nextElement, prevHeight, nextHeight;

        const onMove = (e) => {
            const dy = e.clientY - startY;
            const newPrevHeight = prevHeight + dy;
            const newNextHeight = nextHeight - dy;

            if (newPrevHeight > 40 && newNextHeight > 40) { // Ensure minimum height
                prevElement.style.flexBasis = `${newPrevHeight}px`;
                nextElement.style.flexBasis = `${newNextHeight}px`;
            }
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            saveUIPrefs();
        };

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            prevElement = resizer.previousElementSibling;
            nextElement = resizer.nextElementSibling;

            prevHeight = prevElement.getBoundingClientRect().height;
            nextHeight = nextElement.getBoundingClientRect().height;

            // Set flex properties to make flex-basis authoritative during drag
            prevElement.style.flexGrow = '0';
            prevElement.style.flexShrink = '0';
            nextElement.style.flexGrow = '0';
            nextElement.style.flexShrink = '0';

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    });
}