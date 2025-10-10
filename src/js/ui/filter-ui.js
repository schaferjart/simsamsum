import { NODE_COLUMNS, CONNECTION_COLUMNS, OPERATORS } from './dom-constants.js';
import { getThemeAppropriateColor } from './theme-manager.js';

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

export function getFilterMode() {
    const checkedRadio = document.querySelector('input[name="filter-mode"]:checked');
    return checkedRadio ? checkedRadio.value : 'highlight';
}

export function getFilterRules() {
    const rules = [];
    document.querySelectorAll('#filter-rules-container .filter-rule').forEach(ruleEl => {
        // Check if this is an auto-generated rule (has _ruleData property)
        if (ruleEl._ruleData) {
            // Auto-generated rule - use stored data directly
            rules.push(ruleEl._ruleData);
            return;
        }

        // Manual rule - extract from form elements
        const columnSelect = ruleEl.querySelector('.column-select');
        const operatorSelect = ruleEl.querySelector('.operator-select');
        const valueInput = ruleEl.querySelector('.value-input');
        
        // Skip if essential elements are missing
        if (!columnSelect || !operatorSelect) {
            return;
        }

        const column = columnSelect.value;
        const operator = operatorSelect.value;
        const hasRawValue = Object.prototype.hasOwnProperty.call(ruleEl, '_rawValue');
        const rawValue = hasRawValue ? ruleEl._rawValue : (valueInput ? valueInput.value : '');

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

export function addFilterRuleFromData(rule, onChange, autoScope = null) {
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