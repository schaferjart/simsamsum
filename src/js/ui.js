import { highlightNodeById } from './render.js';
import * as layoutManager from './layoutManager.js';
import { showStatus } from './utils.js';

const FILTER_SETS_API_BASE = '/api/filter-sets';

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
    { id: 'AvgCostTime', name: 'Average Cost Time', type: 'number' },
    { id: 'LastUpdate', name: 'Last Update', type: 'text' },
    { id: 'NextUpdate', name: 'Next Update', type: 'text' },
    { id: 'ScheduleStart', name: 'Schedule Start', type: 'text' },
    { id: 'ScheduleEnd', name: 'Schedule End', type: 'text' },
    { id: 'Frequency', name: 'Frequency', type: 'text' }
];

const NUMERIC_NODE_COLUMNS = NODE_COLUMNS.filter(col => col.type === 'number');
const DEFAULT_SIZE_COLUMN = 'incomingVolume';

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
        { id: 'between', name: 'between' },
        { id: 'eq', name: '=' },
    ]
};

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRangeBoundary(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'object' && value !== null) {
        if (Object.prototype.hasOwnProperty.call(value, 'value')) {
            return normalizeRangeBoundary(value.value);
        }
        if (Object.prototype.hasOwnProperty.call(value, 'input')) {
            return normalizeRangeBoundary(value.input);
        }
    }
    const str = String(value).trim();
    return str === '' ? null : str;
}

function createRangeValue(min, max) {
    return {
        min: normalizeRangeBoundary(min),
        max: normalizeRangeBoundary(max)
    };
}

function formatRangeDisplay(range) {
    if (!isPlainObject(range)) return '';
    const min = normalizeRangeBoundary(range.min ?? range.from ?? range.start);
    const max = normalizeRangeBoundary(range.max ?? range.to ?? range.end);
    if (min !== null && max !== null) return `${min} - ${max}`;
    if (min !== null) return `>= ${min}`;
    if (max !== null) return `<= ${max}`;
    return '';
}

function parseRangeInput(input) {
    if (input === undefined || input === null) {
        return createRangeValue(null, null);
    }
    const text = String(input).trim();
    if (!text) {
        return createRangeValue(null, null);
    }

    const gteMatch = text.match(/^>=?\s*(.+)$/);
    if (gteMatch) {
        return createRangeValue(gteMatch[1], null);
    }

    const lteMatch = text.match(/^<=?\s*(.+)$/);
    if (lteMatch) {
        return createRangeValue(null, lteMatch[1]);
    }

    const dashIndex = text.indexOf('-') >= 0 ? text.indexOf('-') : text.indexOf('–');
    if (dashIndex !== -1) {
        const min = text.slice(0, dashIndex).trim();
        const max = text.slice(dashIndex + 1).trim();
        return createRangeValue(min, max);
    }

    if (text.includes(',')) {
        const parts = text.split(',').map(part => part.trim()).filter(Boolean);
        if (parts.length === 0) return createRangeValue(null, null);
        if (parts.length === 1) return createRangeValue(parts[0], null);
        return createRangeValue(parts[0], parts[1]);
    }

    return createRangeValue(text, null);
}

function rangeIsEmpty(range) {
    if (!isPlainObject(range)) return true;
    const min = normalizeRangeBoundary(range.min ?? range.from ?? range.start);
    const max = normalizeRangeBoundary(range.max ?? range.to ?? range.end);
    return min === null && max === null;
}

function initFilterRuleStylingControls(ruleEl, onChange, existingStyle = null) {
    const styleToggle = ruleEl.querySelector('.style-toggle-input');
    const colorInput = ruleEl.querySelector('.filter-color-input');
    const strokeInput = ruleEl.querySelector('.filter-stroke-input');
    const defaultColor = colorInput?.dataset.defaultColor || getThemeAppropriateColor();

    ruleEl._style = {
        enabled: false,
        color: null,
        strokeWidth: null
    };

    if (!styleToggle || !colorInput || !strokeInput) {
        return;
    }

    const notifyChange = () => {
        if (typeof onChange === 'function') {
            onChange();
        }
    };

    const ensureColorValue = () => {
        if (!colorInput.value) {
            colorInput.value = defaultColor;
        }
        return colorInput.value || defaultColor;
    };

    const setEnabled = (enabled) => {
        ruleEl._style.enabled = enabled;
        colorInput.disabled = !enabled;
        strokeInput.disabled = !enabled;

        if (enabled) {
            const colorValue = existingStyle?.color || ruleEl._style.color || ensureColorValue();
            colorInput.value = colorValue;
            ruleEl._style.color = colorValue;
            if (existingStyle && typeof existingStyle.strokeWidth === 'number') {
                ruleEl._style.strokeWidth = existingStyle.strokeWidth;
                strokeInput.value = String(existingStyle.strokeWidth);
            }
        } else {
            ruleEl._style.color = null;
            ruleEl._style.strokeWidth = null;
            strokeInput.value = '';
        }
    };

    styleToggle.addEventListener('change', () => {
        setEnabled(styleToggle.checked);
        notifyChange();
    });

    colorInput.addEventListener('input', () => {
        if (!styleToggle.checked) return;
        const value = colorInput.value || ensureColorValue();
        ruleEl._style.color = value;
        notifyChange();
    });

    strokeInput.addEventListener('input', () => {
        if (!styleToggle.checked) return;
        const parsed = parseInt(strokeInput.value, 10);
        ruleEl._style.strokeWidth = (!Number.isNaN(parsed) && parsed > 0) ? parsed : null;
        notifyChange();
    });

    if (existingStyle && (existingStyle.color || existingStyle.strokeWidth)) {
        styleToggle.checked = true;
        setEnabled(true);
        if (existingStyle.color) {
            colorInput.value = existingStyle.color;
            ruleEl._style.color = existingStyle.color;
        }
        if (typeof existingStyle.strokeWidth === 'number') {
            strokeInput.value = String(existingStyle.strokeWidth);
            ruleEl._style.strokeWidth = existingStyle.strokeWidth;
        }
    } else {
        styleToggle.checked = false;
        setEnabled(false);
    }
}

function getFilterRuleStylePayload(ruleEl) {
    const style = ruleEl?._style;
    if (!style || !style.enabled) return null;

    const payload = {};
    if (style.color) payload.color = style.color;
    if (typeof style.strokeWidth === 'number' && style.strokeWidth > 0) {
        payload.strokeWidth = style.strokeWidth;
    }

    return Object.keys(payload).length > 0 ? payload : null;
}

function valuesAreEquivalent(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i += 1) {
            if (String(a[i]) !== String(b[i])) return false;
        }
        return true;
    }

    if (isPlainObject(a) && isPlainObject(b)) {
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {
            return false;
        }
    }

    return String(a) === String(b);
}


/**
 * Adds a new filter rule to the UI.
 * @param {function} onChange - Callback function to trigger when the rule changes.
 */
export function addFilterRule(onChange) {
    const container = document.getElementById('filter-rules-container');
    const ruleEl = document.createElement('div');
    ruleEl.className = 'filter-rule';
    ruleEl._valueFormat = 'primitive';
    ruleEl._rawValue = '';

    const defaultStyleColor = getThemeAppropriateColor();

    ruleEl.innerHTML = `
        <div class="filter-rule__row">
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
            <button class="btn btn--danger btn--sm remove-rule-btn" title="Remove rule">&times;</button>
        </div>
        <div class="filter-rule__styling">
            <label class="filter-style-toggle">
                <input type="checkbox" class="style-toggle-input"> Style
            </label>
            <input type="color" class="form-control form-control--sm filter-color-input" value="${defaultStyleColor}" data-default-color="${defaultStyleColor}" title="Highlight color" disabled>
            <input type="number" class="form-control form-control--sm filter-stroke-input" placeholder="Stroke" min="1" max="10" disabled>
        </div>
    `;

    container.appendChild(ruleEl);

    const columnSelect = ruleEl.querySelector('.column-select');
    const operatorSelect = ruleEl.querySelector('.operator-select');
    const valueInput = ruleEl.querySelector('.value-input');
    const strokeInput = ruleEl.querySelector('.stroke-width-input');

    if (strokeInput && typeof rule.strokeWidth === 'number') {
        strokeInput.value = String(rule.strokeWidth);
    }

    initFilterRuleStylingControls(ruleEl, onChange);

    const syncValueFormat = () => {
        const operatorValue = operatorSelect.value;
        if (operatorValue === 'between') {
            valueInput.placeholder = 'min - max';
            valueInput.dataset.valueFormat = 'range';
            ruleEl._valueFormat = 'range';
            if (!isPlainObject(ruleEl._rawValue)) {
                ruleEl._rawValue = createRangeValue(null, null);
            }
        } else {
            valueInput.placeholder = 'Value';
            if (valueInput.dataset.valueFormat === 'range') {
                delete valueInput.dataset.valueFormat;
                ruleEl._valueFormat = 'primitive';
                ruleEl._rawValue = valueInput.value;
            }
        }
    };

    const parseAndStoreValue = () => {
        if (valueInput.dataset.valueFormat === 'range' || ruleEl._valueFormat === 'range') {
            ruleEl._valueFormat = 'range';
            ruleEl._rawValue = parseRangeInput(valueInput.value);
        } else if (valueInput.dataset.valueFormat === 'array' || ruleEl._valueFormat === 'array') {
            const parsed = valueInput.value
                .split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0);
            ruleEl._rawValue = parsed;
            ruleEl._valueFormat = 'array';
        } else {
            ruleEl._valueFormat = 'primitive';
            ruleEl._rawValue = valueInput.value;
        }
    };

    const updateOperators = () => {
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
        syncValueFormat();
    };

    columnSelect.addEventListener('change', () => {
        updateOperators();
        parseAndStoreValue();
        onChange();
    });

    operatorSelect.addEventListener('change', () => {
        syncValueFormat();
        parseAndStoreValue();
        onChange();
    });

    valueInput.addEventListener('input', () => {
        parseAndStoreValue();
        onChange();
    });

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
        const valueInput = ruleEl.querySelector('.value-input');
        const hasRawValue = Object.prototype.hasOwnProperty.call(ruleEl, '_rawValue');
        const rawValue = hasRawValue ? ruleEl._rawValue : valueInput.value;

        const isArray = Array.isArray(rawValue);
        const isRange = !isArray && isPlainObject(rawValue);
        const isEmptyRange = isRange ? rangeIsEmpty(rawValue) : false;
        const isEmpty = isRange ? isEmptyRange : (isArray ? rawValue.length === 0 : rawValue === '' || rawValue == null);

        if (column && operator && !isEmpty) {
            const [scope, columnId] = column.split(':');
            const rule = { scope, column: columnId, operator, value: rawValue };
            const stylePayload = getFilterRuleStylePayload(ruleEl);
            if (stylePayload) {
                rule.style = stylePayload;
            }
            rules.push(rule);
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

export function getDerivedStylingRules(filterRules = []) {
    return buildStylingRulesFromFilterRules(filterRules);
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

    // Filter set management
    document.getElementById('saveFilterSetBtn').addEventListener('click', async () => {
        const name = prompt('Enter a name for this filter set:');
        if (name) {
            await saveFilterSet(name.trim());
            handlers.applyFiltersAndStyles();
        }
    });
    
    document.getElementById('filterSetsSelect').addEventListener('change', async (e) => {
        if (e.target.value) {
            const loaded = await loadFilterSet(e.target.value);
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
            const deleted = await deleteFilterSet(name);
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

// --- Filter Set Management ---

let _filterSets = {}; // Stores named filter sets

/**
 * Sync Handsontable column filters to filter rules
 */
function syncTableFiltersToRules(hot, scope, onChange) {
    if (!hot) return;
    
    const filtersPlugin = hot.getPlugin('filters');
    if (!filtersPlugin) return;
    
    const conditionCollection = filtersPlugin.conditionCollection;
    const columns = hot.getSettings().columns;
    
    console.log(`🔍 Syncing ${scope} table filters...`);
    
    // Clear existing auto-generated rules for this scope
    document.querySelectorAll(`#filter-rules-container .filter-rule[data-auto="${scope}"]`).forEach(el => el.remove());
    
    let rulesAdded = 0;
    
    // Convert each filter condition to a rule
    conditionCollection.exportAllConditions().forEach((columnData) => {
        const { column, conditions } = columnData;
        const columnDef = columns[column];
        const columnId = columnDef?.data;
        
        if (!columnId || !conditions || conditions.length === 0) return;
        
        conditions.forEach(({ name, args }) => {
            const rule = convertFilterToRule(scope, columnId, name, args);
            if (rule) {
                console.log(`➕ Adding filter rule:`, rule);
                addFilterRuleFromData(rule, onChange, scope);
                rulesAdded++;
            }
        });
    });
    
    console.log(`✅ Added ${rulesAdded} filter rules from table`);
    
    // Trigger the visualization update
    if (rulesAdded > 0 && onChange) {
        console.log(`🔄 Triggering filter application...`);
        onChange();
    }
}

/**
 * Convert Handsontable filter condition to rule format
 */
function convertFilterToRule(scope, columnId, conditionName, args) {
    console.log('🔍 convertFilterToRule called:', {scope, columnId, conditionName, args});
    
    // Map table column names to visualization property names
    const columnMapping = {
        'incomingNumber': 'incomingVolume',  // Table uses incomingNumber, viz uses incomingVolume
        'incomingVolume': 'incomingVolume',
        'variable': 'Variable',
        'type': 'Type',
        'subType': 'SubType',
        'execution': 'Execution',
        'platform': 'Platform',
        'name': 'Name',
        'id': 'id',
        'aOR': 'AOR',
        'account': 'Account',
        'monitoring': 'Monitoring',
        'monitoredData': 'MonitoredData',
        'description': 'Description',
        'avgCostTime': 'AvgCostTime',
        'avgCost': 'AvgCost',
        'effectiveCost': 'Effective Cost',
        'lastUpdate': 'LastUpdate',
        'nextUpdate': 'NextUpdate',
        'kPI': 'KPI',
        'scheduleStart': 'ScheduleStart',
        'scheduleEnd': 'ScheduleEnd',
        'frequency': 'Frequency',
        'fromId': 'source',
        'toId': 'target'
    };
    
    const operatorMap = {
        'contains': 'contains',
        'not_contains': 'not_contains',
        'eq': 'equals',
        'neq': 'not_equals',
        'gt': 'gt',
        'gte': 'gt',
        'lt': 'lt',
        'lte': 'lt',
        'begins_with': 'contains',
        'ends_with': 'contains',
        'between': 'between',
        'by_value': 'equals',
    };
    
    const operator = operatorMap[conditionName];
    if (!operator || !args || args.length === 0) return null;
    
    // Map column ID to visualization property
    const mappedColumnId = columnMapping[columnId] || columnId;
    
    let value;
    if (conditionName === 'between') {
        const rangeArg = args[0];
        let min = null;
        let max = null;
        if (Array.isArray(rangeArg)) {
            [min, max] = rangeArg;
        } else if (typeof rangeArg === 'object' && rangeArg !== null) {
            min = rangeArg.from ?? rangeArg.start ?? rangeArg.min ?? rangeArg.value ?? rangeArg.lt ?? null;
            max = rangeArg.to ?? rangeArg.end ?? rangeArg.max ?? rangeArg.secondValue ?? rangeArg.gt ?? null;
            if ((min === null || min === undefined) && Object.prototype.hasOwnProperty.call(rangeArg, '0')) {
                min = rangeArg[0];
            }
            if ((max === null || max === undefined) && Object.prototype.hasOwnProperty.call(rangeArg, '1')) {
                max = rangeArg[1];
            }
        } else {
            min = rangeArg;
        }
        value = createRangeValue(min, max);
        if (rangeIsEmpty(value)) return null;
    } else {
        value = args[0];
        if (Array.isArray(value)) {
            value = value.filter(v => v !== '' && v != null);
            if (value.length === 0) return null;
        }
    }
    
    return {
        scope,
        column: mappedColumnId,
        operator,
        value
    };
}

/**
 * Add a filter rule from data object (used for loading/syncing)
 */
function addFilterRuleFromData(rule, onChange, autoScope = null) {
    const container = document.getElementById('filter-rules-container');
    const ruleEl = document.createElement('div');
    ruleEl.className = 'filter-rule';
    if (autoScope) ruleEl.setAttribute('data-auto', autoScope);

    const scopePrefix = rule.scope === 'node' ? 'node:' : 'connection:';
    const fullColumn = scopePrefix + rule.column;

    const isRangeValue = isPlainObject(rule.value) && !Array.isArray(rule.value);
    const isArrayValue = Array.isArray(rule.value);
    const displayValue = isArrayValue
        ? rule.value.join(', ')
        : isRangeValue
            ? formatRangeDisplay(rule.value)
            : (rule.value || '');
    
    const defaultStyleColor = getThemeAppropriateColor();

    ruleEl.innerHTML = `
        <div class="filter-rule__row">
            <select class="form-control form-control--sm column-select">
                <option value="">-- Select Column --</option>
                <optgroup label="Nodes">
                    ${NODE_COLUMNS.map(c => `<option value="node:${c.id}" ${fullColumn === `node:${c.id}` ? 'selected' : ''}>${c.name}</option>`).join('')}
                </optgroup>
                <optgroup label="Connections">
                    ${CONNECTION_COLUMNS.map(c => `<option value="connection:${c.id}" ${fullColumn === `connection:${c.id}` ? 'selected' : ''}>${c.name}</option>`).join('')}
                </optgroup>
            </select>
            <select class="form-control form-control--sm operator-select"></select>
            <input type="text" class="form-control form-control--sm value-input" value="${displayValue}" placeholder="Value">
            <button class="btn btn--danger btn--sm remove-rule-btn" title="Remove rule">×</button>
        </div>
        <div class="filter-rule__styling">
            <label class="filter-style-toggle">
                <input type="checkbox" class="style-toggle-input"> Style
            </label>
            <input type="color" class="form-control form-control--sm filter-color-input" value="${defaultStyleColor}" data-default-color="${defaultStyleColor}" title="Highlight color" disabled>
            <input type="number" class="form-control form-control--sm filter-stroke-input" placeholder="Stroke" min="1" max="10" disabled>
        </div>
    `;
    
    container.appendChild(ruleEl);
    
    const columnSelect = ruleEl.querySelector('.column-select');
    const operatorSelect = ruleEl.querySelector('.operator-select');
    const valueInput = ruleEl.querySelector('.value-input');

    if (isRangeValue) {
        ruleEl._valueFormat = 'range';
        ruleEl._rawValue = createRangeValue(rule.value?.min ?? rule.value?.from ?? rule.value?.start, rule.value?.max ?? rule.value?.to ?? rule.value?.end);
        valueInput.dataset.valueFormat = 'range';
        valueInput.placeholder = 'min - max';
        valueInput.value = displayValue;
    } else if (isArrayValue) {
        ruleEl._valueFormat = 'array';
        ruleEl._rawValue = [...rule.value];
        valueInput.dataset.valueFormat = 'array';
    } else {
        ruleEl._valueFormat = 'primitive';
        ruleEl._rawValue = rule.value;
    }

    initFilterRuleStylingControls(ruleEl, onChange, rule.style);
    
    // Setup operator dropdown based on column type
    const updateOperators = () => {
        const selected = columnSelect.value;
        if (!selected) {
            operatorSelect.disabled = true;
            valueInput.disabled = true;
            return;
        }
        
        const [scope, colId] = selected.split(':');
        const columns = scope === 'node' ? NODE_COLUMNS : CONNECTION_COLUMNS;
        const col = columns.find(c => c.id === colId);
        
        operatorSelect.disabled = false;
        valueInput.disabled = false;
        
        const ops = OPERATORS[col?.type || 'text'];
        operatorSelect.innerHTML = ops.map(op =>
            `<option value="${op.id}" ${op.id === rule.operator ? 'selected' : ''}>${op.name}</option>`
        ).join('');
    };
    
    const syncOperatorFormatting = (preserveDisplay = false) => {
        const operatorValue = operatorSelect.value;
        if (operatorValue === 'between') {
            valueInput.placeholder = 'min - max';
            valueInput.dataset.valueFormat = 'range';
            ruleEl._valueFormat = 'range';
            if (!isPlainObject(ruleEl._rawValue)) {
                ruleEl._rawValue = createRangeValue(null, null);
            }
            if (!preserveDisplay) {
                valueInput.value = formatRangeDisplay(ruleEl._rawValue);
            }
        } else {
            valueInput.placeholder = 'Value';
            if (valueInput.dataset.valueFormat === 'range') {
                delete valueInput.dataset.valueFormat;
            }
            if (ruleEl._valueFormat === 'range') {
                const fallback = formatRangeDisplay(ruleEl._rawValue);
                ruleEl._rawValue = fallback;
                ruleEl._valueFormat = 'primitive';
                if (!preserveDisplay) {
                    valueInput.value = fallback;
                }
            }
        }
    };

    updateOperators();
    syncOperatorFormatting(true);
    
    columnSelect.addEventListener('change', () => {
        updateOperators();
        syncOperatorFormatting();
        if (onChange) onChange();
    });
    
    operatorSelect.addEventListener('change', () => {
        syncOperatorFormatting();
        if (onChange) onChange();
    });
    
    valueInput.addEventListener('input', () => {
        if (valueInput.dataset.valueFormat === 'range' || ruleEl._valueFormat === 'range') {
            ruleEl._rawValue = parseRangeInput(valueInput.value);
            ruleEl._valueFormat = 'range';
        } else if (valueInput.dataset.valueFormat === 'array' || ruleEl._valueFormat === 'array') {
            const parsed = valueInput.value
                .split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0);
            ruleEl._rawValue = parsed;
            ruleEl._valueFormat = 'array';
        } else {
            ruleEl._rawValue = valueInput.value;
            ruleEl._valueFormat = 'primitive';
        }
        if (onChange) onChange();
    });
    
    ruleEl.querySelector('.remove-rule-btn').addEventListener('click', () => {
        ruleEl.remove();
        if (onChange) onChange();
    });
}

/**
 * Add styling rule from data (for loading)
 */
function addStylingRuleFromData(rule, onChange) {
    const container = document.getElementById('styling-rules-container');
    const ruleEl = document.createElement('div');
    ruleEl.className = 'styling-rule';

    const scopePrefix = rule.scope === 'node' ? 'node:' : 'connection:';
    const fullColumn = scopePrefix + rule.column;
    const strokeValue = (typeof rule.strokeWidth === 'number' && rule.strokeWidth > 0) ? String(rule.strokeWidth) : '';
    const fallbackColor = rule.color || getThemeAppropriateColor();

    ruleEl.innerHTML = `
        <div class="rule-condition">
            If
            <select class="form-control form-control--sm column-select">
                <option value="">-- Select Column --</option>
                <optgroup label="Nodes">
                    ${NODE_COLUMNS.map(c => `<option value="node:${c.id}" ${fullColumn === `node:${c.id}` ? 'selected' : ''}>${c.name}</option>`).join('')}
                </optgroup>
                <optgroup label="Connections">
                    ${CONNECTION_COLUMNS.map(c => `<option value="connection:${c.id}" ${fullColumn === `connection:${c.id}` ? 'selected' : ''}>${c.name}</option>`).join('')}
                </optgroup>
            </select>
            <select class="form-control form-control--sm operator-select" disabled></select>
            <input type="text" class="form-control form-control--sm value-input" value="${rule.value || ''}" placeholder="Value" disabled>
        </div>
        <div class="rule-style">
            Then set
            <input type="color" class="form-control form-control--sm color-input" title="Color" value="${fallbackColor}">
            <input type="number" class="form-control form-control--sm stroke-width-input" placeholder="Stroke Width" min="1" max="10" value="${strokeValue}">
            <button class="btn btn--danger btn--sm remove-rule-btn" title="Remove rule">×</button>
        </div>
    `;

    container.appendChild(ruleEl);

    const columnSelect = ruleEl.querySelector('.column-select');
    const operatorSelect = ruleEl.querySelector('.operator-select');
    const valueInput = ruleEl.querySelector('.value-input');
    const colorInput = ruleEl.querySelector('.color-input');
    const strokeInput = ruleEl.querySelector('.stroke-width-input');
    
    const updateOperators = () => {
        const selected = columnSelect.value;
        if (!selected) {
            operatorSelect.disabled = true;
            valueInput.disabled = true;
            return;
        }
        
        const [scope, colId] = selected.split(':');
        const columns = scope === 'node' ? NODE_COLUMNS : CONNECTION_COLUMNS;
        const col = columns.find(c => c.id === colId);
        
        operatorSelect.disabled = false;
        valueInput.disabled = false;
        
        const ops = OPERATORS[col?.type || 'text'];
        operatorSelect.innerHTML = ops.map(op => 
            `<option value="${op.id}" ${op.id === rule.operator ? 'selected' : ''}>${op.name}</option>`
        ).join('');
    };
    
    updateOperators();
    
    columnSelect.addEventListener('change', () => {
        updateOperators();
        if (onChange) onChange();
    });
    
    operatorSelect.addEventListener('change', () => {
        if (onChange) onChange();
    });
    
    valueInput.addEventListener('input', () => {
        if (onChange) onChange();
    });
    
    colorInput.addEventListener('input', () => {
        if (onChange) onChange();
    });

    strokeInput.addEventListener('input', () => {
        if (onChange) onChange();
    });
    
    ruleEl.querySelector('.remove-rule-btn').addEventListener('click', () => {
        ruleEl.remove();
        if (onChange) onChange();
    });
}

/**
 * Collect current filter rules from the UI
 */
function collectFilterRules() {
    const rules = [];
    document.querySelectorAll('#filter-rules-container .filter-rule').forEach(ruleEl => {
        const columnSelect = ruleEl.querySelector('.column-select');
        const operatorSelect = ruleEl.querySelector('.operator-select');
        const valueInput = ruleEl.querySelector('.value-input');
        
        const selected = columnSelect.value;
        if (!selected) return;
        
        const [scope, column] = selected.split(':');
        const operator = operatorSelect.value;
        const hasRawValue = Object.prototype.hasOwnProperty.call(ruleEl, '_rawValue');
        const rawValue = hasRawValue ? ruleEl._rawValue : valueInput.value;
        const isArray = Array.isArray(rawValue);
        const isRange = !isArray && isPlainObject(rawValue);
        const isEmptyRange = isRange ? rangeIsEmpty(rawValue) : false;
        const isEmpty = isRange ? isEmptyRange : (isArray ? rawValue.length === 0 : rawValue === '' || rawValue == null);
        
        if (operator && !isEmpty) {
            const rule = { scope, column, operator, value: rawValue };
            const stylePayload = getFilterRuleStylePayload(ruleEl);
            if (stylePayload) {
                rule.style = stylePayload;
            }
            rules.push(rule);
        }
    });
    return rules;
}

/**
 * Collect current styling rules from the UI
 */
function collectStylingRules() {
    const rules = [];
    document.querySelectorAll('#styling-rules-container .styling-rule').forEach(ruleEl => {
        const columnSelect = ruleEl.querySelector('.column-select');
        const operatorSelect = ruleEl.querySelector('.operator-select');
        const valueInput = ruleEl.querySelector('.value-input');
        const colorInput = ruleEl.querySelector('.color-input');
        const strokeInput = ruleEl.querySelector('.stroke-width-input');
        
        const selected = columnSelect.value;
        if (!selected) return;
        
        const [scope, column] = selected.split(':');
        const operator = operatorSelect.value;
        const value = valueInput.value;
        const color = colorInput.value;
        const strokeWidthRaw = strokeInput?.value;
        const strokeWidth = strokeWidthRaw ? parseInt(strokeWidthRaw, 10) : null;
        
        if (operator && value) {
            rules.push({
                scope,
                column,
                operator,
                value,
                color,
                strokeWidth: (!Number.isNaN(strokeWidth) && strokeWidth > 0) ? strokeWidth : null,
                fromFilter: false
            });
        }
    });
    return rules;
}

function buildSerializableStylingFromFilters(filterRules = []) {
    return (filterRules || []).reduce((acc, rule) => {
        const style = rule?.style;
        if (!style) return acc;

        const color = style.color || null;
        const strokeWidth = (typeof style.strokeWidth === 'number' && style.strokeWidth > 0)
            ? style.strokeWidth
            : null;

        if (!color && strokeWidth == null) {
            return acc;
        }

        acc.push({
            scope: rule.scope,
            column: rule.column,
            operator: rule.operator,
            value: rule.value,
            color,
            strokeWidth,
            fromFilter: true
        });
        return acc;
    }, []);
}

function buildStylingRulesFromFilterRules(filterRules = []) {
    return (filterRules || []).reduce((acc, rule) => {
        const style = rule?.style;
        if (!style) return acc;

        const payload = {};
        if (style.color) payload.color = style.color;
        if (typeof style.strokeWidth === 'number' && style.strokeWidth > 0) {
            payload.strokeWidth = style.strokeWidth;
        }

        if (Object.keys(payload).length === 0) {
            return acc;
        }

        acc.push({
            scope: rule.scope,
            condition: {
                column: rule.column,
                operator: rule.operator,
                value: rule.value
            },
            style: payload,
            meta: { source: 'filter' }
        });
        return acc;
    }, []);
}

/**
 * Save current filter rules as a named set
 */
export async function saveFilterSet(name) {
    if (!name || !name.trim()) return false;

    const normalizedName = name.trim();
    const filters = collectFilterRules();
    const manualStyling = collectStylingRules();
    const derivedStyling = buildSerializableStylingFromFilters(filters);
    const styling = [...derivedStyling, ...manualStyling];

    try {
        const response = await fetch(`${FILTER_SETS_API_BASE}/${encodeURIComponent(normalizedName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters, styling })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const savedSet = result?.filterSet || {};

        _filterSets[normalizedName] = {
            filters: Array.isArray(savedSet.filters) ? savedSet.filters : filters,
            styling: Array.isArray(savedSet.styling) ? savedSet.styling : styling,
            timestamp: savedSet.timestamp || new Date().toISOString()
        };

        try { localStorage.setItem('workflow-filter-sets', JSON.stringify(_filterSets)); } catch {}

        showStatus(`Filter set "${normalizedName}" saved`, 'success');
        updateFilterSetDropdown();
        return true;
    } catch (error) {
        console.warn(`Filter set save fallback for "${normalizedName}":`, error);

        const timestamp = new Date().toISOString();
        _filterSets[normalizedName] = { filters, styling, timestamp };

        try {
            localStorage.setItem('workflow-filter-sets', JSON.stringify(_filterSets));
            showStatus(`Filter set "${normalizedName}" saved locally`, 'warning');
            updateFilterSetDropdown();
            return false;
        } catch (storageError) {
            console.error('Failed to persist filter set locally:', storageError);
            showStatus('Failed to save filter set', 'error');
            return false;
        }
    }
}

/**
 * Load a named filter set
 */
export async function loadFilterSet(name) {
    if (!name) return false;

    const normalizedName = name.trim();
    if (!normalizedName) return false;

    if (!_filterSets[normalizedName]) {
        try {
            const response = await fetch(`${FILTER_SETS_API_BASE}/${encodeURIComponent(normalizedName)}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            const set = result?.filterSet;
            if (set) {
                _filterSets[normalizedName] = {
                    filters: Array.isArray(set.filters) ? set.filters : [],
                    styling: Array.isArray(set.styling) ? set.styling : [],
                    timestamp: set.timestamp || null
                };
                try { localStorage.setItem('workflow-filter-sets', JSON.stringify(_filterSets)); } catch {}
            }
        } catch (error) {
            console.error(`Failed to load filter set "${normalizedName}" from API:`, error);
            if (!_filterSets[normalizedName]) {
                showStatus('Failed to load filter set', 'error');
                return false;
            }
        }
    }

    const set = _filterSets[normalizedName];
    if (!set) {
        showStatus('Filter set not found', 'error');
        return false;
    }

    const filters = Array.isArray(set.filters) ? set.filters.map(rule => ({ ...rule })) : [];
    const stylingEntries = Array.isArray(set.styling) ? set.styling.map(entry => ({ ...entry })) : [];

    const normalizedFilters = filters.map(rule => {
        const normalized = { ...rule };
        if (normalized.style && typeof normalized.style === 'object') {
            const color = normalized.style.color || null;
            const strokeWidth = (typeof normalized.style.strokeWidth === 'number' && normalized.style.strokeWidth > 0)
                ? normalized.style.strokeWidth
                : null;
            normalized.style = {};
            if (color) normalized.style.color = color;
            if (strokeWidth != null) normalized.style.strokeWidth = strokeWidth;
            if (Object.keys(normalized.style).length === 0) {
                delete normalized.style;
            }
        }
        return normalized;
    });

    const normalizedStyling = stylingEntries.map(entry => {
        const column = entry.column ?? entry.condition?.column ?? '';
        const operator = entry.operator ?? entry.condition?.operator ?? '';
        const value = entry.value ?? entry.condition?.value;
        const color = entry.color ?? entry.style?.color ?? null;
        const strokeCandidate = entry.strokeWidth ?? entry.style?.strokeWidth;
        const strokeWidth = (typeof strokeCandidate === 'number' && strokeCandidate > 0) ? strokeCandidate : null;
        const fromFilter = entry.fromFilter === true || entry.meta?.source === 'filter';
        return {
            scope: entry.scope,
            column,
            operator,
            value,
            color,
            strokeWidth,
            fromFilter
        };
    }).filter(entry => entry && entry.scope && entry.column && entry.operator);

    const remainingStyling = [];

    normalizedStyling.forEach(entry => {
        if (entry.fromFilter) {
            const match = normalizedFilters.find(rule =>
                rule.scope === entry.scope &&
                rule.column === entry.column &&
                rule.operator === entry.operator &&
                !rule.style &&
                valuesAreEquivalent(rule.value, entry.value)
            );
            if (match) {
                const payload = {};
                if (entry.color) payload.color = entry.color;
                if (entry.strokeWidth != null) payload.strokeWidth = entry.strokeWidth;
                if (Object.keys(payload).length > 0) {
                    match.style = payload;
                }
                return;
            }
        }
        remainingStyling.push(entry);
    });

    const normalizedSet = {
        filters: normalizedFilters,
        styling: remainingStyling,
        timestamp: set.timestamp || null
    };
    _filterSets[normalizedName] = normalizedSet;
    try { localStorage.setItem('workflow-filter-sets', JSON.stringify(_filterSets)); } catch {}

    document.getElementById('filter-rules-container').innerHTML = '';
    document.getElementById('styling-rules-container').innerHTML = '';

    normalizedSet.filters.forEach(rule => {
        addFilterRuleFromData(rule, null);
    });

    normalizedSet.styling.forEach(entry => {
        if (!entry || !entry.scope || !entry.column || !entry.operator) return;
        addStylingRuleFromData({
            scope: entry.scope,
            column: entry.column,
            operator: entry.operator,
            value: entry.value,
            color: entry.color,
            strokeWidth: entry.strokeWidth
        }, null);
    });

    showStatus(`Filter set "${normalizedName}" loaded`, 'success');
    return true;
}

/**
 * Delete a named filter set
 */
export async function deleteFilterSet(name) {
    if (!name) return false;

    const normalizedName = name.trim();
    if (!normalizedName) return false;

    try {
        const response = await fetch(`${FILTER_SETS_API_BASE}/${encodeURIComponent(normalizedName)}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error(`Failed to delete filter set "${normalizedName}" via API:`, error);
        showStatus('Failed to delete filter set', 'error');
        return false;
    }

    delete _filterSets[normalizedName];
    try { localStorage.setItem('workflow-filter-sets', JSON.stringify(_filterSets)); } catch {}
    showStatus(`Filter set "${normalizedName}" deleted`, 'success');
    updateFilterSetDropdown();
    return true;
}

/**
 * Update the filter set dropdown
 */
function updateFilterSetDropdown() {
    const select = document.getElementById('filterSetsSelect');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Load Filter Set...</option>';
    
    Object.keys(_filterSets).sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        if (name === currentValue) option.selected = true;
        select.appendChild(option);
    });
}

/**
 * Initialize filter sets from localStorage
 */
async function initFilterSets() {
    try {
        const response = await fetch(FILTER_SETS_API_BASE);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const setsArray = Array.isArray(payload) ? payload : payload.filterSets || [];

        const mapped = {};
        setsArray.forEach(item => {
            if (item && item.name) {
                mapped[item.name] = {
                    filters: Array.isArray(item.filters) ? item.filters : [],
                    styling: Array.isArray(item.styling) ? item.styling : [],
                    timestamp: item.timestamp || null
                };
            }
        });

        _filterSets = mapped;
        updateFilterSetDropdown();
        try { localStorage.setItem('workflow-filter-sets', JSON.stringify(_filterSets)); } catch {}
    } catch (error) {
        console.warn('Filter set API unavailable, falling back to localStorage:', error);
        try {
            const stored = localStorage.getItem('workflow-filter-sets');
            _filterSets = stored ? JSON.parse(stored) || {} : {};
            updateFilterSetDropdown();
        } catch (e) {
            console.error('Failed to load filter sets:', e);
            _filterSets = {};
        }
    }
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
// Flag to prevent selection sync during initialization/programmatic operations
let _allowSelectionSync = false;

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
        filters: true, // Enable column filters
        dropdownMenu: ['filter_by_condition', 'filter_by_value', 'filter_action_bar'],
    };

    // Elements table (formerly nodes)
    const elementTypes = ['Resource', 'Action', 'State', 'Decision'];
    const executionTypes = ['Automatic', 'Manual', 'Applicant', 'Noemie', 'Gil'];
    const subTypes = ['Job Portal', 'Form Incoming', 'SMS', 'Call', 'Mail', 'Video Incoming', 'Out', 'Checkpoint', 'State'];
    _nodesHot = new Handsontable(elementsEl, {
        ...baseSettings,
        data: (core.elements || core.nodes || []).map(e => ({ ...e })),
        afterFilter: () => {
            // Temporarily disable selection sync during filter operations
            const wasAllowed = _allowSelectionSync;
            _allowSelectionSync = false;
            
            syncTableFiltersToRules(_nodesHot, 'node', () => core.applyFiltersAndStyles());
            
            // Re-enable after a short delay
            setTimeout(() => {
                _allowSelectionSync = wasAllowed;
            }, 100);
        },
        afterSelectionEnd: (row, column, row2, column2, selectionLayerLevel) => {
            // Sync table row selection to visualization
            // Only sync on user selection, not programmatic (like filter-based selections)
            if (!_allowSelectionSync) return; // Ignore during initialization
            if (!core || !core.selectionManager) return;
            if (selectionLayerLevel !== 0) return; // Ignore non-primary selections
            
            // Validate row indices
            if (row === undefined || row2 === undefined || row < 0 || row2 < 0) return;
            
            const selectedRows = new Set();
            
            // Only get the current selection layer, not all selections
            const minRow = Math.min(row, row2);
            const maxRow = Math.max(row, row2);
            
            // Get PHYSICAL (visible) row indices, not logical source indices
            for (let visualRow = minRow; visualRow <= maxRow; visualRow++) {
                const physicalRow = _nodesHot.toPhysicalRow(visualRow);
                if (physicalRow !== null && physicalRow !== undefined && physicalRow >= 0) {
                    selectedRows.add(physicalRow);
                }
            }
            
            // Convert physical row indices to node IDs
            const data = _nodesHot.getSourceData();
            const nodeIds = Array.from(selectedRows)
                .map(physicalIdx => data[physicalIdx]?.id)
                .filter(id => id);
            
            // Count visible rows to detect if this is a genuine selection or accidental "all"
            const countRows = _nodesHot.countRows();
            const selectedCount = maxRow - minRow + 1;
            
            // Only sync if:
            // 1. We have IDs to select
            // 2. Selection is reasonable (not all source data when table shows filtered subset)
            if (nodeIds.length > 0) {
                // Prevent sync if selecting way more than visible rows (indicates wrong index mapping)
                if (nodeIds.length > countRows * 2) {
                    console.warn('⚠️ Selection anomaly detected, skipping sync:', nodeIds.length, 'IDs from', selectedCount, 'rows');
                    return;
                }
                console.log('📋 Table selection → Visualization:', nodeIds);
                core.selectionManager.selectMultiple(nodeIds);
            } else {
                core.selectionManager.clearSelection();
            }
        },
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'name', title: 'Name' },
            { data: 'incomingNumber', title: 'Incoming Number', type: 'numeric', numericFormat: { pattern: '0' } },
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
        afterFilter: () => {
            syncTableFiltersToRules(_connectionsHot, 'connection', () => core.applyFiltersAndStyles());
        },
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

    // Initialize filter sets
    await initFilterSets();

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

    // Enable selection sync after preferences load and all async operations complete
    // Delay must be longer than loadUIPrefs setTimeout (100ms) + render time
    setTimeout(() => {
        _allowSelectionSync = true;
        console.log('✅ Table selection sync enabled');
    }, 1000);

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