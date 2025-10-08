/**
 * @module filtering/style-applicator
 * This module is responsible for applying custom styles to nodes and links
 * based on a set of conditional rules.
 */
import { evaluateRule } from './rule-evaluator.js';

/**
 * Applies a set of styling rules to nodes and links.
 * This function modifies the node and link objects directly by adding a `customStyle` property.
 * @param {Array<object>} nodes - The array of nodes to style.
 * @param {Array<object>} links - The array of links to style.
 * @param {Array<object>} rules - The array of styling rules, each with a `condition` and a `style`.
 */
export function applyStylingRules(nodes, links, rules) {
    // Reset any existing custom styles to ensure a clean slate
    nodes.forEach(node => node.customStyle = {});
    links.forEach(link => link.customStyle = {});

    if (!rules || rules.length === 0) {
        return;
    }

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    rules.forEach(rule => {
        if (!rule.condition || !rule.style) return;

        if (rule.scope === 'node') {
            nodes.forEach(node => {
                if (evaluateRule(node, rule.condition)) {
                    Object.assign(node.customStyle, rule.style);
                }
            });
        } else if (rule.scope === 'connection') {
            links.forEach(link => {
                if (evaluateRule(link, rule.condition, nodeById)) {
                    Object.assign(link.customStyle, rule.style);
                }
            });
        }
    });
}