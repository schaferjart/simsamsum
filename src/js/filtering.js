/**
 * A helper function to safely get a nested property from an object.
 * Tries case-insensitive matching if exact match not found.
 * @param {object} obj - The object to query.
 * @param {string} path - The path to the property (e.g., 'source.name').
 * @returns {*} The value of the property, or undefined if not found.
 */
function getProperty(obj, path) {
    // Try exact match first
    const exactValue = path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
    if (exactValue !== undefined) return exactValue;
    
    // Try case-insensitive match
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (!current) return undefined;
        
        // Try exact match
        if (current[part] !== undefined) {
            current = current[part];
            continue;
        }
        
        // Try case-insensitive match
        const lowerPart = part.toLowerCase();
        const key = Object.keys(current).find(k => k.toLowerCase() === lowerPart);
        if (key) {
            current = current[key];
        } else {
            return undefined;
        }
    }
    return current;
}

function toNumeric(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const str = String(value).trim();
    if (str === '') return null;
    const normalized = str.replace(/,/g, '');
    const num = Number(normalized);
    return Number.isNaN(num) ? null : num;
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
        console.log(`⚠️ Property "${rule.column}" not found on item:`, item.id || item);
        return false;
    }

    const itemStr = String(itemValue).toLowerCase();

    if (rule.operator === 'between') {
        return evaluateSimpleRule(itemStr, itemValue, null, ruleValue, rule.operator);
    }
    
    // Handle array of values (from dropdown filters)
    if (Array.isArray(ruleValue)) {
        console.log(`🚨 ARRAY DETECTED for ${item.id}: column=${rule.column}, values=`, ruleValue);
        // For 'equals' with array, check if item value is in the array
        if (rule.operator === 'equals') {
            console.log(`🔍 Array comparison for ${item.id}:`, 
                '\n  itemValue:', itemValue, 
                '\n  itemStr:', itemStr,
                '\n  ruleValue:', ruleValue,
                '\n  lowercased:', ruleValue.map(v => String(v).toLowerCase()),
                '\n  checking comparisons:',
                ruleValue.map(v => ({
                    original: v,
                    lowered: String(v).toLowerCase(),
                    matches: String(v).toLowerCase() === itemStr
                })));
            const match = ruleValue.some(v => String(v).toLowerCase() === itemStr);
            console.log(`  🎯 Final match result:`, match);
            return match;
        }
        // For other operators with arrays, use first value
        const ruleStr = String(ruleValue[0]).toLowerCase();
        return evaluateSimpleRule(itemStr, itemValue, ruleStr, ruleValue[0], rule.operator);
    }
    
    const ruleStr = String(ruleValue).toLowerCase();
    return evaluateSimpleRule(itemStr, itemValue, ruleStr, ruleValue, rule.operator);
}

/**
 * Helper function to evaluate simple (non-array) rule comparisons
 */
function evaluateSimpleRule(itemStr, itemValue, ruleStr, ruleValue, operator) {
    switch (operator) {
        case 'contains':
            return itemStr.includes(ruleStr);
        case 'not_contains':
            return !itemStr.includes(ruleStr);
        case 'equals':
            return itemStr === ruleStr;
        case 'not_equals':
            return itemStr !== ruleStr;
        case 'gt': {
            const itemNum = toNumeric(itemValue);
            const ruleNum = toNumeric(ruleValue);
            if (itemNum === null || ruleNum === null) return false;
            return itemNum > ruleNum;
        }
        case 'lt': {
            const itemNum = toNumeric(itemValue);
            const ruleNum = toNumeric(ruleValue);
            if (itemNum === null || ruleNum === null) return false;
            return itemNum < ruleNum;
        }
        case 'eq': {
            const itemNum = toNumeric(itemValue);
            const ruleNum = toNumeric(ruleValue);
            if (itemNum === null || ruleNum === null) return false;
            return itemNum === ruleNum;
        }
        case 'between': {
            if (!ruleValue || typeof ruleValue !== 'object') return false;
            const min = toNumeric(ruleValue.min ?? ruleValue.from ?? ruleValue.start ?? ruleValue.lower ?? null);
            const max = toNumeric(ruleValue.max ?? ruleValue.to ?? ruleValue.end ?? ruleValue.upper ?? null);
            const itemNum = toNumeric(itemValue);
            if (itemNum === null) return false;
            if (min !== null && itemNum < min) return false;
            if (max !== null && itemNum > max) return false;
            return true;
        }
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
            // Group rules by column - within a column use OR, between columns use AND
            const rulesByColumn = {};
            nodeRules.forEach(rule => {
                if (!rulesByColumn[rule.column]) {
                    rulesByColumn[rule.column] = [];
                }
                rulesByColumn[rule.column].push(rule);
            });
            
            // For each column, at least one rule must match (OR within column)
            // All columns must have a match (AND between columns)
            const matches = Object.values(rulesByColumn).every(columnRules => 
                columnRules.some(rule => evaluateRule(node, rule))
            );
            
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
    // Group rules by column - within a column use OR, between columns use AND
    if (nodeRules.length > 0) {
        console.log('🔍 Applying node filters:', nodeRules);
        
        // Debug: Show first few nodes' Type values
        console.log('📋 Sample node Type values:', nodes.slice(0, 5).map(n => ({ id: n.id, type: n.type, Type: n.Type })));
        
        filteredNodes = nodes.filter(node => {
            // Group rules by column
            const rulesByColumn = {};
            nodeRules.forEach(rule => {
                if (!rulesByColumn[rule.column]) {
                    rulesByColumn[rule.column] = [];
                }
                rulesByColumn[rule.column].push(rule);
            });
            
            // For each column, at least one rule must match (OR within column)
            // All columns must have a match (AND between columns)
            const result = Object.values(rulesByColumn).every(columnRules => 
                columnRules.some(rule => {
                    const match = evaluateRule(node, rule);
                    if (!match && node.id === 'indeed') {
                        // Debug first node to see why it fails
                        console.log('❌ Node', node.id, 'failed rule:', rule.column, rule.operator, rule.value, '| actual:', getProperty(node, rule.column));
                    }
                    return match;
                })
            );
            return result;
        });
        console.log('✅ Filtered to', filteredNodes.length, 'nodes');
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

    const ruleValue = rule.value;

    if (Array.isArray(ruleValue)) {
        if (rule.operator === 'equals') {
            const lowered = ruleValue.map(v => String(v).toLowerCase());
            return lowered.includes(String(itemValue).toLowerCase());
        }
        const fallback = ruleValue.length > 0 ? ruleValue[0] : null;
        return evaluateSimpleRule(String(itemValue).toLowerCase(), itemValue, fallback ? String(fallback).toLowerCase() : '', fallback, rule.operator);
    }

    if (rule.operator === 'between') {
        return evaluateSimpleRule(String(itemValue).toLowerCase(), itemValue, null, ruleValue, 'between');
    }

    const itemStr = String(itemValue).toLowerCase();
    const ruleStr = String(ruleValue).toLowerCase();
    return evaluateSimpleRule(itemStr, itemValue, ruleStr, ruleValue, rule.operator);
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