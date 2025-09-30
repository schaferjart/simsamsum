class StylingRule {
    constructor(id, condition, style) {
        this.id = id;
        this.condition = condition; // { column, operator, value }
        this.style = style; // { color, stroke, strokeWidth }
    }

    /**
     * Checks if a node matches the rule's condition.
     * @param {object} node - The node to check.
     * @returns {boolean} - True if the node matches, false otherwise.
     */
    matches(node) {
        const { column, operator, value } = this.condition;
        const nodeValue = node[column];

        switch (operator) {
            case 'is':
                return String(nodeValue) === String(value);
            case 'is_not':
                return String(nodeValue) !== String(value);
            case 'contains':
                return String(nodeValue).includes(String(value));
            case 'does_not_contain':
                return !String(nodeValue).includes(String(value));
            default:
                return false;
        }
    }
}

class StylingManager {
    constructor(getFilterOptions, applyStylesCallback) {
        this.rules = [];
        this.getFilterOptions = getFilterOptions;
        this.applyStylesCallback = applyStylesCallback;
        this.loadRules();
    }

    /**
     * Adds a new styling rule.
     */
    addRule() {
        const id = `rule-${Date.now()}`;
        const newRule = new StylingRule(id, { column: 'Type', operator: 'is', value: 'Action' }, { color: '#ff0000', stroke: '#000000', strokeWidth: 2 });
        this.rules.push(newRule);
        this.renderRule(newRule);
        this.saveRules();
        this.applyStylesCallback();
    }

    /**
     * Removes a styling rule.
     * @param {string} id - The ID of the rule to remove.
     */
    removeRule(id) {
        this.rules = this.rules.filter(rule => rule.id !== id);
        this.saveRules();
        this.applyStylesCallback();
    }

    /**
     * Updates a styling rule.
     * @param {string} id - The ID of the rule to update.
     * @param {object} newCondition - The new condition for the rule.
     * @param {object} newStyle - The new style for the rule.
     */
    updateRule(id, newCondition, newStyle) {
        const rule = this.rules.find(rule => rule.id === id);
        if (rule) {
            rule.condition = newCondition;
            rule.style = newStyle;
            this.saveRules();
            this.applyStylesCallback();
        }
    }

    /**
     * Applies the styling rules to a set of nodes.
     * @param {Array<object>} nodes - The nodes to style.
     */
    applyStyles(nodes) {
        nodes.forEach(node => {
            // Reset to default styles
            delete node.style;

            this.rules.forEach(rule => {
                if (rule.matches(node)) {
                    node.style = { ...node.style, ...rule.style };
                }
            });
        });
    }

    /**
     * Renders a single styling rule in the UI.
     * @param {StylingRule} rule - The rule to render.
     */
    renderRule(rule) {
        const ruleContainer = document.getElementById('rule-container');
        const ruleRow = document.createElement('div');
        ruleRow.className = 'rule-row';
        ruleRow.dataset.id = rule.id;

        const columnSelect = document.createElement('select');
        columnSelect.className = 'form-control form-control--sm';
        const { columns } = this.getFilterOptions();
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            columnSelect.appendChild(option);
        });
        columnSelect.value = rule.condition.column;

        const operatorSelect = document.createElement('select');
        operatorSelect.className = 'form-control form-control--sm';
        ['is', 'is_not', 'contains', 'does_not_contain'].forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op.replace('_', ' ');
            operatorSelect.appendChild(option);
        });
        operatorSelect.value = rule.condition.operator;

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'form-control form-control--sm';
        valueInput.value = rule.condition.value;

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'form-control form-control--sm';
        colorInput.value = rule.style.color;

        const strokeInput = document.createElement('input');
        strokeInput.type = 'color';
        strokeInput.className = 'form-control form-control--sm';
        strokeInput.value = rule.style.stroke;

        const strokeWidthInput = document.createElement('input');
        strokeWidthInput.type = 'number';
        strokeWidthInput.className = 'form-control form-control--sm';
        strokeWidthInput.value = rule.style.strokeWidth;
        strokeWidthInput.min = 0;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn--danger btn--sm';
        removeBtn.textContent = 'X';
        removeBtn.addEventListener('click', () => {
            this.removeRule(rule.id);
            ruleRow.remove();
        });

        const updateFn = () => {
            const newCondition = {
                column: columnSelect.value,
                operator: operatorSelect.value,
                value: valueInput.value,
            };
            const newStyle = {
                color: colorInput.value,
                stroke: strokeInput.value,
                strokeWidth: parseInt(strokeWidthInput.value, 10),
            };
            this.updateRule(rule.id, newCondition, newStyle);
        };

        [columnSelect, operatorSelect, valueInput, colorInput, strokeInput, strokeWidthInput].forEach(el => {
            el.addEventListener('change', updateFn);
        });

        ruleRow.append(columnSelect, operatorSelect, valueInput, colorInput, strokeInput, strokeWidthInput, removeBtn);
        ruleContainer.appendChild(ruleRow);
    }

    /**
     * Renders all styling rules in the UI.
     */
    renderAllRules() {
        document.getElementById('rule-container').innerHTML = '';
        this.rules.forEach(rule => this.renderRule(rule));
    }

    /**
     * Saves the styling rules to localStorage.
     */
    saveRules() {
        localStorage.setItem('stylingRules', JSON.stringify(this.rules));
    }

    /**
     * Loads the styling rules from localStorage.
     */
    loadRules() {
        const savedRules = localStorage.getItem('stylingRules');
        if (savedRules) {
            this.rules = JSON.parse(savedRules).map(r => new StylingRule(r.id, r.condition, r.style));
        }
    }
}

export function initializeStyling(getFilterOptions, applyStylesCallback) {
    const stylingManager = new StylingManager(getFilterOptions, applyStylesCallback);
    document.getElementById('add-rule-btn').addEventListener('click', () => stylingManager.addRule());
    stylingManager.renderAllRules();
    return stylingManager;
}