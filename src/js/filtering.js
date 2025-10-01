/**
 * A helper function to safely get a nested property from an object.
 * @param {object} obj - The object to query.
 * @param {string} path - The path to the property (e.g., 'source.name').
 * @returns {*} The value of the property, or undefined if not found.
 */
function getProperty(obj, path) {
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

/**
 * Evaluates a single rule against a data item.
 * @param {object} item - The node or link data.
 * @param {object} rule - The filter rule object.
 * @returns {boolean} True if the item matches the rule, false otherwise.
 */
function evaluateRule(item, rule) {
    const itemValue = getProperty(item, rule.column);
    const ruleValue = rule.value;

    if (itemValue === undefined) {
        return false;
    }

    const itemStr = String(itemValue).toLowerCase();
    const ruleStr = String(ruleValue).toLowerCase();

    switch (rule.operator) {
        case 'contains':
            return itemStr.includes(ruleStr);
        case 'not_contains':
            return !itemStr.includes(ruleStr);
        case 'equals':
            return itemStr === ruleStr;
        case 'not_equals':
            return itemStr !== ruleStr;
        case 'gt':
            return parseFloat(itemValue) > parseFloat(ruleValue);
        case 'lt':
            return parseFloat(itemValue) < parseFloat(ruleValue);
        case 'eq':
            return parseFloat(itemValue) === parseFloat(ruleValue);
        default:
            return false;
    }
}

/**
 * Filters the nodes and links based on a set of rules.
 * @param {Array<object>} nodes - The array of all nodes.
 * @param {Array<object>} links - The array of all links.
 * @param {Array<object>} rules - The array of filter rules from the UI.
 * @returns {{filteredNodes: Array<object>, filteredLinks: Array<object>}}
 */
export function filterData(nodes, links, rules) {
    if (rules.length === 0) {
        return { filteredNodes: nodes, filteredLinks: links };
    }

    const nodeRules = rules.filter(r => r.scope === 'node');
    const connectionRules = rules.filter(r => r.scope === 'connection');

    let filteredNodes = nodes;
    let filteredLinks = links;

    // Apply node filters
    if (nodeRules.length > 0) {
        filteredNodes = nodes.filter(node => {
            return nodeRules.every(rule => evaluateRule(node, rule));
        });
    }

    // Apply connection filters
    if (connectionRules.length > 0) {
        const matchingLinks = links.filter(link => {
            return connectionRules.every(rule => evaluateRule(link, rule));
        });
        // If there are connection rules, the visible nodes are only those participating in the matching links
        const visibleNodeIds = new Set();
        matchingLinks.forEach(link => {
            visibleNodeIds.add(link.source.id);
            visibleNodeIds.add(link.target.id);
        });
        filteredNodes = nodes.filter(node => visibleNodeIds.has(node.id));
        filteredLinks = matchingLinks;
    }

    // Ensure that links only connect to visible nodes
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(link =>
        visibleNodeIds.has(link.source.id) && visibleNodeIds.has(link.target.id)
    );

    return { filteredNodes, filteredLinks };
}

/**
 * Applies a set of styling rules to nodes and links.
 * This function modifies the node and link objects directly by adding a `customStyle` property.
 * @param {Array<object>} nodes - The array of nodes to style.
 * @param {Array<object>} links - The array of links to style.
 * @param {Array<object>} rules - The array of styling rules from the UI.
 */
export function applyStylingRules(nodes, links, rules) {
    // Reset any existing custom styles
    nodes.forEach(node => node.customStyle = {});
    links.forEach(link => link.customStyle = {});

    if (rules.length === 0) {
        return;
    }

    rules.forEach(rule => {
        const items = rule.scope === 'node' ? nodes : links;
        items.forEach(item => {
            if (evaluateRule(item, rule.condition)) {
                // Apply the style to the item's customStyle property
                Object.assign(item.customStyle, rule.style);
            }
        });
    });
}