/**
 * @module filtering/rule-evaluator
 * This module is responsible for evaluating filtering and styling rules against data items.
 */
import { getProperty } from './property-resolver.js';
import { OPERATORS } from './operators.js';

/**
 * Gets the source node object from a link, handling both string IDs and object references.
 * @param {object} link - The link object.
 * @param {Map<string, object>} nodeById - A map of node IDs to node objects.
 * @returns {object|null} The source node object or null if not found.
 * @private
 */
function getSourceNode(link, nodeById) {
    if (typeof link.source === 'object' && link.source !== null) {
        return link.source;
    } else if (typeof link.source === 'string') {
        return nodeById.get(link.source);
    }
    return null;
}

/**
 * Gets the target node object from a link, handling both string IDs and object references.
 * @param {object} link - The link object.
 * @param {Map<string, object>} nodeById - A map of node IDs to node objects.
 * @returns {object|null} The target node object or null if not found.
 * @private
 */
function getTargetNode(link, nodeById) {
    if (typeof link.target === 'object' && link.target !== null) {
        return link.target;
    } else if (typeof link.target === 'string') {
        return nodeById.get(link.target);
    }
    return null;
}

/**
 * Evaluates a rule against a data item (node or link).
 * This function can handle rules that reference properties of linked nodes (e.g., 'source.Type').
 * @param {object} item - The node or link data.
 * @param {object} rule - The filter rule object.
 * @param {Map<string, object>} [nodeById] - Optional map of node IDs to node objects, required for link rules accessing node properties.
 * @returns {boolean} True if the item matches the rule, false otherwise.
 */
export function evaluateRule(item, rule, nodeById) {
    let itemValue;

    // Handle special cases for accessing linked node properties
    if (nodeById && rule.column.startsWith('source.')) {
        const property = rule.column.substring(7);
        const sourceNode = getSourceNode(item, nodeById);
        itemValue = sourceNode ? getProperty(sourceNode, property) : undefined;
    } else if (nodeById && rule.column.startsWith('target.')) {
        const property = rule.column.substring(7);
        const targetNode = getTargetNode(item, nodeById);
        itemValue = targetNode ? getProperty(targetNode, property) : undefined;
    } else {
        itemValue = getProperty(item, rule.column);
    }

    if (itemValue === undefined) {
        return false;
    }

    const operatorFunc = OPERATORS[rule.operator];
    if (!operatorFunc) {
        console.warn(`Unknown filter operator: ${rule.operator}`);
        return false;
    }

    const ruleValue = rule.value;

    if (Array.isArray(ruleValue)) {
        if (rule.operator === 'equals') {
            return ruleValue.some(v => OPERATORS.equals(itemValue, v));
        }
        if (rule.operator === 'not_equals') {
            return ruleValue.every(v => OPERATORS.not_equals(itemValue, v));
        }
        const firstValue = ruleValue.length > 0 ? ruleValue[0] : null;
        return operatorFunc(itemValue, firstValue);
    }

    return operatorFunc(itemValue, ruleValue);
}