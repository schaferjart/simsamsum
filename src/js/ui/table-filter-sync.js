/**
 * Table Filter Sync
 * Synchronizes Handsontable column filters with the filter rules UI
 */

import { NODE_COLUMNS, CONNECTION_COLUMNS } from './dom-constants.js';

// Operator mapping from Handsontable filter conditions to our filter syntax
const OPERATOR_MAP = {
    'contains': 'contains',
    'not_contains': 'not_contains',
    'eq': 'equals',
    'neq': 'not_equals',
    'gt': 'gt',
    'gte': 'gte',
    'lt': 'lt',
    'lte': 'lte',
    'begins_with': 'contains',
    'ends_with': 'contains',
    'by_value': 'in',
    'empty': 'equals',
    'not_empty': 'not_equals',
    'between': 'between'
};

/**
 * Convert Handsontable filter condition to our filter rule format
 * @param {string} scope - 'node' or 'connection'
 * @param {string} columnId - The column identifier
 * @param {string} conditionName - Handsontable condition name
 * @param {Array} args - Condition arguments
 * @returns {object|null} Filter rule object or null
 */
function convertFilterToRule(scope, columnId, conditionName, args) {
    const operator = OPERATOR_MAP[conditionName];
    if (!operator) {
        console.warn(`Unknown filter condition: ${conditionName}`);
        return null;
    }

    let value = args && args.length > 0 ? args[0] : '';
    
    // Handle special cases
    if (conditionName === 'empty') {
        value = '';
    } else if (conditionName === 'not_empty') {
        value = '';
        // For not_empty, we'll use not_equals with empty string
    } else if (conditionName === 'by_value' && Array.isArray(value)) {
        // Multiple values - join them
        value = value.join(', ');
    } else if (conditionName === 'between' && args.length >= 2) {
        // Range - format as "min - max"
        value = `${args[0]} - ${args[1]}`;
    }

    return {
        scope: scope,
        column: columnId,
        operator: operator,
        value: value,
        isAuto: true  // Mark as auto-generated for proper restoration
    };
}

/**
 * Sync Handsontable filters to filter rules UI
 * @param {Handsontable} hot - Handsontable instance
 * @param {string} scope - 'node' or 'connection'
 * @param {Function} onChange - Callback when rules change
 */
export function syncTableFiltersToRules(hot, scope, onChange) {
    console.log('🔍 syncTableFiltersToRules called:', { scope, hasHot: !!hot });
    
    if (!hot) return;

    const filtersPlugin = hot.getPlugin('filters');
    if (!filtersPlugin) {
        console.warn('⚠️ Filters plugin not found');
        return;
    }

    console.log('✅ Filters plugin found');

    // Get container for filter rules
    const container = document.getElementById('filter-rules-container');
    if (!container) {
        console.warn('⚠️ Filter rules container not found');
        return;
    }

    // Remove any existing auto-generated rules for this scope
    const existingAutoRules = container.querySelectorAll(`.filter-rule[data-auto="${scope}"]`);
    console.log(`🗑️ Removing ${existingAutoRules.length} existing auto-rules for ${scope}`);
    existingAutoRules.forEach(rule => rule.remove());

    // Get column metadata
    const columns = scope === 'node' ? NODE_COLUMNS : CONNECTION_COLUMNS;
    const colHeaders = hot.getColHeader();

    let rulesAdded = 0;

    // Access the internal condition collection
    // Handsontable stores filter conditions in conditionCollection property
    const conditionCollection = filtersPlugin.conditionCollection;
    
    if (!conditionCollection) {
        console.warn('⚠️ No condition collection found');
        return;
    }

    console.log('📦 Condition collection found:', conditionCollection);

    // Iterate through all columns to find active filters
    for (let physicalCol = 0; physicalCol < colHeaders.length; physicalCol++) {
        // Get conditions for this column
        let conditions = [];
        
        try {
            // Access column conditions from the internal collection
            const columnConditions = conditionCollection.getConditions(physicalCol);
            if (columnConditions && columnConditions.length > 0) {
                conditions = columnConditions;
            }
        } catch (e) {
            console.log(`⚠️ Error accessing conditions for column ${physicalCol}: ${e.message}`);
            continue;
        }

        if (conditions.length === 0) {
            continue;
        }

        console.log(`📋 Column ${physicalCol} (${colHeaders[physicalCol]}) has ${conditions.length} filter(s):`, conditions);

        // Get column prop name
        const colProp = hot.colToProp(physicalCol);
        if (!colProp) continue;

        // Find column metadata
        const columnMeta = columns.find(c => c.id === colProp);
        const columnName = columnMeta ? columnMeta.name : colProp;

        // Process each condition
        conditions.forEach(condition => {
            if (!condition || !condition.name) return;

            console.log(`🔧 Processing condition:`, condition);

            const rule = convertFilterToRule(scope, colProp, condition.name, condition.args);
            if (!rule) return;

            console.log(`✨ Created rule:`, rule);

            // Create filter rule UI element
            addAutoFilterRule(rule, columnName, scope, onChange);
            rulesAdded++;
        });
    }

    console.log(`✅ Added ${rulesAdded} auto-generated rules`);

    // Trigger onChange if provided
    if (typeof onChange === 'function') {
        onChange();
    }
}

/**
 * Add a filter rule from data (auto-generated from table filter)
 * Can also be used to restore auto-generated rules from saved filter sets
 * @param {object} rule - Rule data
 * @param {string} columnName - Display name of column (optional, will be derived if not provided)
 * @param {string} scope - 'node' or 'connection' (optional, will use rule.scope if not provided)
 * @param {Function} onChange - Callback when rules change
 */
export function addAutoFilterRule(rule, columnName, scope, onChange) {
    const actualScope = scope || rule.scope || 'node';
    
    // If columnName not provided, try to find it from column metadata
    let displayName = columnName;
    if (!displayName && rule.column) {
        const columns = actualScope === 'node' ? NODE_COLUMNS : CONNECTION_COLUMNS;
        const columnMeta = columns.find(c => c.id === rule.column);
        displayName = columnMeta ? columnMeta.name : rule.column;
    }
    
    const container = document.getElementById('filter-rules-container');
    if (!container) return;

    const ruleEl = document.createElement('div');
    ruleEl.className = 'filter-rule filter-rule--auto';
    ruleEl.setAttribute('data-auto', scope); // Mark as auto-generated
    ruleEl._valueFormat = 'primitive';
    ruleEl._rawValue = rule.value || '';

    // Get default theme color
    const defaultStyleColor = getThemeAppropriateColor();

    // Create a read-only display of the filter with styling controls
    ruleEl.innerHTML = `
        <div class="filter-rule__row">
            <div class="filter-rule__display">
                <span class="filter-rule__label">${scope === 'node' ? 'Node' : 'Connection'}: ${columnName}</span>
                <span class="filter-rule__operator">${getOperatorDisplayName(rule.operator)}</span>
                <span class="filter-rule__value">${rule.value || '(empty)'}</span>
            </div>
            <button class="btn btn--danger btn--sm remove-rule-btn" title="Remove filter">&times;</button>
        </div>
        <div class="filter-rule__styling">
            <label class="filter-style-toggle">
                <input type="checkbox" class="style-toggle-input"> Style
            </label>
            <input type="color" class="form-control form-control--sm filter-color-input" value="${defaultStyleColor}" data-default-color="${defaultStyleColor}" title="Highlight color" disabled>
            <input type="number" class="form-control form-control--sm filter-stroke-input" placeholder="Stroke" min="1" max="10" disabled>
        </div>
        <div class="filter-rule__note">
            <small>Auto-generated from table filter</small>
        </div>
    `;

    // Store rule data
    ruleEl._ruleData = rule;

    // Initialize styling controls
    initAutoRuleStylingControls(ruleEl, onChange, rule.style);

    // Add remove functionality
    const removeBtn = ruleEl.querySelector('.remove-rule-btn');
    removeBtn.addEventListener('click', () => {
        ruleEl.remove();
        if (typeof onChange === 'function') {
            onChange();
        }
    });

    container.appendChild(ruleEl);
}

/**
 * Initialize styling controls for auto-generated rule
 * @param {HTMLElement} ruleEl - Rule element
 * @param {Function} onChange - Change callback
 * @param {object} existingStyle - Existing style data
 */
function initAutoRuleStylingControls(ruleEl, onChange, existingStyle = null) {
    const styleToggle = ruleEl.querySelector('.style-toggle-input');
    const colorInput = ruleEl.querySelector('.filter-color-input');
    const strokeInput = ruleEl.querySelector('.filter-stroke-input');
    const defaultColor = colorInput?.dataset.defaultColor || getThemeAppropriateColor();

    if (!styleToggle || !colorInput || !strokeInput) {
        return;
    }

    const notifyChange = () => {
        if (typeof onChange === 'function') {
            onChange();
        }
    };

    // Apply existing style if provided
    if (existingStyle) {
        if (existingStyle.color) {
            colorInput.value = existingStyle.color;
        }
        if (typeof existingStyle.strokeWidth === 'number' && existingStyle.strokeWidth > 0) {
            strokeInput.value = String(existingStyle.strokeWidth);
        }
        if (existingStyle.color || (typeof existingStyle.strokeWidth === 'number' && existingStyle.strokeWidth > 0)) {
            styleToggle.checked = true;
            colorInput.disabled = false;
            strokeInput.disabled = false;
        }
    }

    // Update _ruleData with style when changed
    const updateStyle = () => {
        if (!ruleEl._ruleData) return;

        if (styleToggle.checked) {
            const style = {};
            if (colorInput.value && colorInput.value !== defaultColor) {
                style.color = colorInput.value;
            }
            const strokeValue = parseInt(strokeInput.value, 10);
            if (!isNaN(strokeValue) && strokeValue > 0) {
                style.strokeWidth = strokeValue;
            }
            if (Object.keys(style).length > 0) {
                ruleEl._ruleData.style = style;
            } else {
                delete ruleEl._ruleData.style;
            }
        } else {
            delete ruleEl._ruleData.style;
        }
        notifyChange();
    };

    styleToggle.addEventListener('change', () => {
        colorInput.disabled = !styleToggle.checked;
        strokeInput.disabled = !styleToggle.checked;
        updateStyle();
    });

    colorInput.addEventListener('change', updateStyle);
    strokeInput.addEventListener('change', updateStyle);
}

/**
 * Get theme-appropriate default color
 * @returns {string} Hex color
 */
function getThemeAppropriateColor() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    return isDarkMode ? '#60a5fa' : '#3b82f6';
}

/**
 * Get display name for operator
 * @param {string} operator - Operator key
 * @returns {string} Display name
 */
function getOperatorDisplayName(operator) {
    const names = {
        'equals': '=',
        'not_equals': '≠',
        'contains': 'contains',
        'not_contains': 'not contains',
        'gt': '>',
        'gte': '≥',
        'lt': '<',
        'lte': '≤',
        'between': 'between',
        'in': 'in'
    };
    return names[operator] || operator;
}

/**
 * Get filter rules from UI (including auto-generated ones)
 * @returns {Array} Array of filter rule objects
 */
export function getAllFilterRules() {
    const container = document.getElementById('filter-rules-container');
    if (!container) return [];

    const rules = [];
    const ruleElements = container.querySelectorAll('.filter-rule');

    ruleElements.forEach(ruleEl => {
        if (ruleEl._ruleData) {
            // Auto-generated rule
            rules.push(ruleEl._ruleData);
        } else {
            // Manual rule - extract data from inputs
            const columnSelect = ruleEl.querySelector('.column-select');
            const operatorSelect = ruleEl.querySelector('.operator-select');
            const valueInput = ruleEl.querySelector('.value-input');

            if (!columnSelect || !operatorSelect || !valueInput) return;

            const columnValue = columnSelect.value;
            if (!columnValue) return;

            const [scope, column] = columnValue.split(':');
            
            rules.push({
                scope: scope,
                column: column,
                operator: operatorSelect.value,
                value: valueInput.value
            });
        }
    });

    return rules;
}
