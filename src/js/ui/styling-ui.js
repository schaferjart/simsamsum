import { NODE_COLUMNS, CONNECTION_COLUMNS, OPERATORS } from './dom-constants.js';
import { getThemeAppropriateColor } from './theme-manager.js';

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

export function addStylingRuleFromData(rule, onChange) {
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