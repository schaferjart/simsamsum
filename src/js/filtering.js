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
 * @param {string} mode - Either 'exclude' (traditional filtering) or 'highlight' (highlighting mode)
 * @returns {{filteredNodes: Array<object>, filteredLinks: Array<object>}}
 */
export function filterData(nodes, links, rules, mode = 'exclude') {
    if (rules.length === 0) {
        // Reset any previous filtering styles
        nodes.forEach(node => {
            if (node.filterStyle) delete node.filterStyle;
        });
        links.forEach(link => {
            if (link.filterStyle) delete link.filterStyle;
        });
        return { filteredNodes: nodes, filteredLinks: links };
    }

    const nodeRules = rules.filter(r => r.scope === 'node');
    const connectionRules = rules.filter(r => r.scope === 'connection');

    if (mode === 'highlight') {
        return applyHighlightMode(nodes, links, nodeRules, connectionRules);
    } else {
        return applyExcludeMode(nodes, links, nodeRules, connectionRules);
    }
}

/**
 * Applies filtering in highlight mode - all elements remain visible but matching ones are highlighted.
 */
function applyHighlightMode(nodes, links, nodeRules, connectionRules) {
    // Reset filter styles
    nodes.forEach(node => {
        node.filterStyle = { highlighted: false, dimmed: false };
    });
    links.forEach(link => {
        link.filterStyle = { highlighted: false, dimmed: false };
    });

    // Create a node lookup for enhanced link evaluation
    const nodeById = new Map(nodes.map(n => [n.id, n]));

    // Find matching nodes
    const matchingNodeIds = new Set();
    if (nodeRules.length > 0) {
        nodes.forEach(node => {
            const matches = nodeRules.every(rule => evaluateRule(node, rule));
            if (matches) {
                matchingNodeIds.add(node.id);
                node.filterStyle.highlighted = true;
            }
        });
    }

    // Find matching connections
    const matchingLinkIds = new Set();
    const linkedNodeIds = new Set();
    if (connectionRules.length > 0) {
        links.forEach((link, index) => {
            const matches = connectionRules.every(rule => evaluateLinkRule(link, rule, nodeById));
            if (matches) {
                matchingLinkIds.add(index);
                link.filterStyle.highlighted = true;
                // Also highlight nodes that are part of matching connections
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                linkedNodeIds.add(sourceId);
                linkedNodeIds.add(targetId);
            }
        });

        // Highlight nodes connected to matching links
        nodes.forEach(node => {
            if (linkedNodeIds.has(node.id)) {
                node.filterStyle.highlighted = true;
            }
        });
    }

    // If we have any matches, dim non-matching elements for better contrast
    const hasMatches = matchingNodeIds.size > 0 || matchingLinkIds.size > 0 || linkedNodeIds.size > 0;
    if (hasMatches) {
        nodes.forEach(node => {
            if (!node.filterStyle.highlighted) {
                node.filterStyle.dimmed = true;
            }
        });
        links.forEach(link => {
            if (!link.filterStyle.highlighted) {
                link.filterStyle.dimmed = true;
            }
        });
    }

    return { filteredNodes: nodes, filteredLinks: links };
}

/**
 * Applies filtering in exclude mode - traditional filtering that removes non-matching elements.
 */
function applyExcludeMode(nodes, links, nodeRules, connectionRules) {
    let filteredNodes = nodes;
    let filteredLinks = links;

    // Create a node lookup for enhanced link evaluation
    const nodeById = new Map(nodes.map(n => [n.id, n]));

    // Apply node filters
    if (nodeRules.length > 0) {
        filteredNodes = nodes.filter(node => {
            return nodeRules.every(rule => evaluateRule(node, rule));
        });
    }

    // Apply connection filters
    if (connectionRules.length > 0) {
        const matchingLinks = links.filter(link => {
            return connectionRules.every(rule => evaluateLinkRule(link, rule, nodeById));
        });
        
        // If there are connection rules, we have two options:
        // 1. Show only nodes participating in matching links (current behavior)
        // 2. Show all nodes but only matching links
        // Let's use option 2 for better visibility
        filteredLinks = matchingLinks;
        
        // Keep all nodes that were already filtered by node rules
        // This preserves node visibility when filtering connections
    }

    // Ensure that links only connect to visible nodes
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

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

    // Create a node lookup for enhanced link evaluation
    const nodeById = new Map(nodes.map(n => [n.id, n]));

    rules.forEach((rule, ruleIndex) => {
        if (rule.scope === 'node') {
            let matchedNodes = 0;
            nodes.forEach(node => {
                if (evaluateRule(node, rule.condition)) {
                    Object.assign(node.customStyle, rule.style);
                    matchedNodes++;
                }
            });
        } else if (rule.scope === 'connection') {
            let matchedLinks = 0;
            links.forEach(link => {
                // Enhanced link evaluation that can access linked node properties
                if (evaluateLinkRule(link, rule.condition, nodeById)) {
                    Object.assign(link.customStyle, rule.style);
                    matchedLinks++;
                }
            });
        }
    });
}

/**
 * Evaluates a rule against a link, with support for accessing linked node properties.
 * @param {object} link - The link data.
 * @param {object} rule - The filter rule object.
 * @param {Map} nodeById - Map of node IDs to node objects.
 * @returns {boolean} True if the link matches the rule, false otherwise.
 */
function evaluateLinkRule(link, rule, nodeById) {
    let itemValue;

    // Handle special cases for accessing linked node properties
    if (rule.column.startsWith('source.')) {
        const property = rule.column.substring(7); // Remove 'source.'
        const sourceNode = getSourceNode(link, nodeById);
        itemValue = sourceNode ? sourceNode[property] : undefined;
    } else if (rule.column.startsWith('target.')) {
        const property = rule.column.substring(7); // Remove 'target.'
        const targetNode = getTargetNode(link, nodeById);
        itemValue = targetNode ? targetNode[property] : undefined;
    } else {
        // Regular property access
        itemValue = getProperty(link, rule.column);
    }

    if (itemValue === undefined) {
        return false;
    }

    const itemStr = String(itemValue).toLowerCase();
    const ruleStr = String(rule.value).toLowerCase();

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
            return parseFloat(itemValue) > parseFloat(rule.value);
        case 'lt':
            return parseFloat(itemValue) < parseFloat(rule.value);
        case 'eq':
            return parseFloat(itemValue) === parseFloat(rule.value);
        default:
            return false;
    }
}

/**
 * Gets the source node object from a link, handling both string IDs and object references.
 */
function getSourceNode(link, nodeById) {
    if (typeof link.source === 'object') {
        return link.source;
    } else if (typeof link.source === 'string') {
        return nodeById.get(link.source);
    }
    return null;
}

/**
 * Gets the target node object from a link, handling both string IDs and object references.
 */
function getTargetNode(link, nodeById) {
    if (typeof link.target === 'object') {
        return link.target;
    } else if (typeof link.target === 'string') {
        return nodeById.get(link.target);
    }
    return null;
}