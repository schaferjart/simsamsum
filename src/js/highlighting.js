/**
 * Advanced highlighting and filtering module for column-based filtering and visual styling
 */

/**
 * Configuration for available columns and their unique values
 * This will be populated dynamically from the data
 */
let availableColumns = {
    type: [],
    execution: [],
    monitoring: [],
    platform: [],
    subType: [],
    aOR: []
};

/**
 * Active column filters: { columnName: [selectedValues] }
 */
let activeColumnFilters = {};

/**
 * Active highlight rules: [{ conditions: {}, style: { color, strokeWidth } }]
 */
let activeHighlightRules = [];

/**
 * Initialize the column filter system with available data
 * @param {Array<Object>} nodes - All nodes to extract column values from
 */
export function initializeColumnFilters(nodes) {
    if (!nodes || nodes.length === 0) return;
    
    // Extract unique values for each column
    const columns = {
        type: new Set(),
        execution: new Set(),
        monitoring: new Set(),
        platform: new Set(),
        subType: new Set(),
        aOR: new Set()
    };
    
    nodes.forEach(node => {
        if (node.Type) columns.type.add(node.Type);
        if (node.Execution) columns.execution.add(node.Execution);
        if (node.Monitoring) columns.monitoring.add(node.Monitoring);
        if (node.Platform) columns.platform.add(node.Platform);
        if (node.SubType) columns.subType.add(node.SubType);
        if (node.aOR) columns.aOR.add(node.aOR);
    });
    
    // Convert sets to sorted arrays
    availableColumns = {
        type: Array.from(columns.type).sort(),
        execution: Array.from(columns.execution).sort(),
        monitoring: Array.from(columns.monitoring).sort(),
        platform: Array.from(columns.platform).sort(),
        subType: Array.from(columns.subType).sort(),
        aOR: Array.from(columns.aOR).sort()
    };
    
    console.log('📊 Available columns initialized:', availableColumns);
}

/**
 * Get available columns for filtering
 * @returns {Object} Available columns with their possible values
 */
export function getAvailableColumns() {
    return availableColumns;
}

/**
 * Add a new column filter
 * @param {string} column - Column name
 * @param {Array<string>} values - Selected values
 */
export function addColumnFilter(column, values) {
    if (values && values.length > 0) {
        activeColumnFilters[column] = values;
    } else {
        delete activeColumnFilters[column];
    }
    console.log('🔍 Active column filters:', activeColumnFilters);
}

/**
 * Remove a column filter
 * @param {string} column - Column name to remove
 */
export function removeColumnFilter(column) {
    delete activeColumnFilters[column];
}

/**
 * Get active column filters
 * @returns {Object} Active filters
 */
export function getActiveColumnFilters() {
    return activeColumnFilters;
}

/**
 * Clear all column filters
 */
export function clearColumnFilters() {
    activeColumnFilters = {};
}

/**
 * Add a highlight rule
 * @param {Object} rule - { conditions: { column: [values] }, nodeStyle: {}, linkStyle: {} }
 */
export function addHighlightRule(rule) {
    activeHighlightRules.push(rule);
    console.log('🎨 Active highlight rules:', activeHighlightRules);
}

/**
 * Remove a highlight rule by index
 * @param {number} index - Rule index
 */
export function removeHighlightRule(index) {
    activeHighlightRules.splice(index, 1);
}

/**
 * Get active highlight rules
 * @returns {Array} Active highlight rules
 */
export function getActiveHighlightRules() {
    return activeHighlightRules;
}

/**
 * Clear all highlight rules
 */
export function clearHighlightRules() {
    activeHighlightRules = [];
}

/**
 * Check if a node matches the given conditions
 * @param {Object} node - Node to check
 * @param {Object} conditions - Conditions to match { column: [values] }
 * @returns {boolean} True if node matches all conditions
 */
export function nodeMatchesConditions(node, conditions) {
    for (const [column, values] of Object.entries(conditions)) {
        if (!values || values.length === 0) continue;
        
        const nodeValue = node[column] || node[column.charAt(0).toUpperCase() + column.slice(1)];
        if (!values.includes(nodeValue)) {
            return false;
        }
    }
    return true;
}

/**
 * Get the style for a node based on active highlight rules
 * @param {Object} node - The node to style
 * @returns {Object|null} Style object or null if no rules match
 */
export function getNodeStyle(node) {
    for (const rule of activeHighlightRules) {
        if (nodeMatchesConditions(node, rule.conditions)) {
            return rule.nodeStyle;
        }
    }
    return null;
}

/**
 * Get the style for a link based on active highlight rules
 * @param {Object} link - The link to style
 * @param {Array<Object>} nodes - All nodes for lookup
 * @returns {Object|null} Style object or null if no rules match
 */
export function getLinkStyle(link, nodes) {
    const sourceNode = nodes.find(n => n.id === (link.source.id || link.source));
    const targetNode = nodes.find(n => n.id === (link.target.id || link.target));
    
    if (!sourceNode || !targetNode) return null;
    
    for (const rule of activeHighlightRules) {
        // Check if both endpoints match the conditions
        if (rule.linkCondition === 'both' && 
            nodeMatchesConditions(sourceNode, rule.conditions) && 
            nodeMatchesConditions(targetNode, rule.conditions)) {
            return rule.linkStyle;
        }
        // Check if either endpoint matches
        else if (rule.linkCondition === 'either' && 
            (nodeMatchesConditions(sourceNode, rule.conditions) || 
             nodeMatchesConditions(targetNode, rule.conditions))) {
            return rule.linkStyle;
        }
    }
    return null;
}

/**
 * Create HTML for a column filter widget
 * @param {string} filterId - Unique ID for this filter
 * @returns {string} HTML string
 */
export function createColumnFilterHTML(filterId) {
    const columnOptions = Object.keys(availableColumns).map(col => 
        `<option value="${col}">${col.charAt(0).toUpperCase() + col.slice(1)}</option>`
    ).join('');
    
    return `
        <div class="column-filter" data-filter-id="${filterId}">
            <select class="form-control form-control--sm column-select">
                <option value="">Select Column...</option>
                ${columnOptions}
            </select>
            <select class="form-control form-control--sm value-select" multiple style="display: none;">
            </select>
            <button class="btn btn--outline btn--xs remove-filter">×</button>
        </div>
    `;
}

/**
 * Create HTML for a highlight rule widget
 * @param {string} ruleId - Unique ID for this rule
 * @returns {string} HTML string
 */
export function createHighlightRuleHTML(ruleId) {
    const columnOptions = Object.keys(availableColumns).map(col => 
        `<option value="${col}">${col.charAt(0).toUpperCase() + col.slice(1)}</option>`
    ).join('');
    
    return `
        <div class="highlight-rule" data-rule-id="${ruleId}">
            <div class="rule-condition">
                <select class="form-control form-control--sm column-select">
                    <option value="">Select Column...</option>
                    ${columnOptions}
                </select>
                <select class="form-control form-control--sm value-select" multiple style="display: none;">
                </select>
            </div>
            <div class="rule-style">
                <label class="form-label--sm">Style:</label>
                <input type="checkbox" class="apply-to-nodes" checked> Nodes
                <input type="color" class="node-color" value="#ff6b35" title="Node Color">
                <input type="checkbox" class="apply-to-links"> Links
                <select class="link-condition" style="display: none;">
                    <option value="both">Both ends match</option>
                    <option value="either">Either end matches</option>
                </select>
                <input type="color" class="link-color" value="#ff6b35" title="Link Color" style="display: none;">
                <label class="form-label--sm">Width:</label>
                <input type="number" class="stroke-width" value="2" min="1" max="10" style="width: 50px;">
            </div>
            <button class="btn btn--outline btn--xs remove-rule">×</button>
        </div>
    `;
}

/**
 * Update the value select dropdown when a column is chosen
 * @param {HTMLSelectElement} columnSelect - The column select element
 * @param {HTMLSelectElement} valueSelect - The value select element to update
 */
export function updateValueSelect(columnSelect, valueSelect) {
    const column = columnSelect.value;
    if (!column || !availableColumns[column]) {
        valueSelect.style.display = 'none';
        valueSelect.innerHTML = '';
        return;
    }
    
    valueSelect.innerHTML = availableColumns[column].map(value => 
        `<option value="${value}">${value}</option>`
    ).join('');
    valueSelect.style.display = 'block';
}
