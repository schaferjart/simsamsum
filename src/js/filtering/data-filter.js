/**
 * @module filtering/data-filter
 * This module provides the main function for filtering graph data (nodes and links)
 * based on a set of rules. It supports both exclusion and highlighting modes.
 */
import { evaluateRule } from './rule-evaluator.js';

/**
 * Applies filtering in highlight mode. All elements remain visible, but matching ones are highlighted.
 * @param {Array<object>} nodes - The full array of nodes.
 * @param {Array<object>} links - The full array of links.
 * @param {Array<object>} nodeRules - The rules to apply to nodes.
 * @param {Array<object>} connectionRules - The rules to apply to connections.
 * @returns {{filteredNodes: Array<object>, filteredLinks: Array<object>}} The original nodes and links with `filterStyle` properties added.
 * @private
 */
function applyHighlightMode(nodes, links, nodeRules, connectionRules) {
    // Reset filter styles
    nodes.forEach(node => {
        node.filterStyle = { highlighted: false, dimmed: false };
    });
    links.forEach(link => {
        link.filterStyle = { highlighted: false, dimmed: false };
    });

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    const matchingNodeIds = new Set();
    if (nodeRules.length > 0) {
        nodes.forEach(node => {
            const rulesByColumn = {};
            nodeRules.forEach(rule => {
                if (!rulesByColumn[rule.column]) rulesByColumn[rule.column] = [];
                rulesByColumn[rule.column].push(rule);
            });

            const matches = Object.values(rulesByColumn).every(columnRules =>
                columnRules.some(rule => evaluateRule(node, rule))
            );

            if (matches) {
                matchingNodeIds.add(node.id);
                node.filterStyle.highlighted = true;
            }
        });
    }

    const matchingLinkIds = new Set();
    const linkedNodeIds = new Set();
    if (connectionRules.length > 0) {
        links.forEach((link, index) => {
            const rulesByColumn = {};
            connectionRules.forEach(rule => {
                if (!rulesByColumn[rule.column]) rulesByColumn[rule.column] = [];
                rulesByColumn[rule.column].push(rule);
            });

            const matches = Object.values(rulesByColumn).every(columnRules =>
                columnRules.some(rule => evaluateRule(link, rule, nodeById))
            );

            if (matches) {
                matchingLinkIds.add(index);
                link.filterStyle.highlighted = true;
                const sourceId = link.source?.id || link.source;
                const targetId = link.target?.id || link.target;
                if (sourceId) linkedNodeIds.add(sourceId);
                if (targetId) linkedNodeIds.add(targetId);
            }
        });

        nodes.forEach(node => {
            if (linkedNodeIds.has(node.id)) {
                node.filterStyle.highlighted = true;
            }
        });
    }

    const hasMatches = matchingNodeIds.size > 0 || matchingLinkIds.size > 0 || linkedNodeIds.size > 0;
    if (hasMatches) {
        nodes.forEach(node => {
            if (!node.filterStyle.highlighted) node.filterStyle.dimmed = true;
        });
        links.forEach(link => {
            if (!link.filterStyle.highlighted) link.filterStyle.dimmed = true;
        });
    }

    return { filteredNodes: nodes, filteredLinks: links };
}

/**
 * Applies filtering in exclude mode, removing non-matching elements.
 * @param {Array<object>} nodes - The full array of nodes.
 * @param {Array<object>} links - The full array of links.
 * @param {Array<object>} nodeRules - The rules to apply to nodes.
 * @param {Array<object>} connectionRules - The rules to apply to connections.
 * @returns {{filteredNodes: Array<object>, filteredLinks: Array<object>}} The filtered nodes and links.
 * @private
 */
function applyExcludeMode(nodes, links, nodeRules, connectionRules) {
    let filteredNodes = nodes;
    let filteredLinks = links;

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    if (nodeRules.length > 0) {
        filteredNodes = nodes.filter(node => {
            const rulesByColumn = {};
            nodeRules.forEach(rule => {
                if (!rulesByColumn[rule.column]) rulesByColumn[rule.column] = [];
                rulesByColumn[rule.column].push(rule);
            });

            return Object.values(rulesByColumn).every(columnRules =>
                columnRules.some(rule => evaluateRule(node, rule))
            );
        });
    }

    if (connectionRules.length > 0) {
        filteredLinks = links.filter(link => {
            const rulesByColumn = {};
            connectionRules.forEach(rule => {
                if (!rulesByColumn[rule.column]) rulesByColumn[rule.column] = [];
                rulesByColumn[rule.column].push(rule);
            });

            return Object.values(rulesByColumn).every(columnRules =>
                columnRules.some(rule => evaluateRule(link, rule, nodeById))
            );
        });
    }

    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(link => {
        const sourceId = link.source?.id || link.source;
        const targetId = link.target?.id || link.target;
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    return { filteredNodes, filteredLinks };
}

/**
 * Filters the nodes and links based on a set of rules.
 * @param {Array<object>} nodes - The array of all nodes.
 * @param {Array<object>} links - The array of all links.
 * @param {Array<object>} rules - The array of filter rules from the UI.
 * @param {string} mode - Either 'exclude' (traditional filtering) or 'highlight' (highlighting mode).
 * @returns {{filteredNodes: Array<object>, filteredLinks: Array<object>}}
 */
export function filterData(nodes, links, rules, mode = 'exclude') {
    if (!rules || rules.length === 0) {
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