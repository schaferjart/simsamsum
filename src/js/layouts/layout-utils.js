/**
 * @module layouts/layout-utils
 * This module contains utility functions shared across different layout algorithms.
 */

/**
 * Ensures that link source and target properties are node objects, not just IDs.
 * D3 layouts require object references to correctly calculate positions.
 * @param {Array<Object>} links - The array of links.
 * @param {Array<Object>} nodes - The array of nodes.
 */
export function linkify(links, nodes) {
    const byId = new Map(nodes.map(n => [n.id, n]));
    for (let i = 0; i < links.length; i++) {
        const l = links[i];
        if (!l) continue;
        // Check if source is not a valid object reference
        if (!l.source || typeof l.source !== 'object' || !byId.has(l.source.id)) {
            l.source = byId.get(l.source?.id || l.source);
        }
        // Check if target is not a valid object reference
        if (!l.target || typeof l.target !== 'object' || !byId.has(l.target.id)) {
            l.target = byId.get(l.target?.id || l.target);
        }
    }
}