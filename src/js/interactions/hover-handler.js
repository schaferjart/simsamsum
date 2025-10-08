/**
 * @module interactions/hover-handler
 * This module manages hover effects, such as highlighting nodes and their connections.
 */
import { highlightNode as renderHighlight, clearHighlight as renderClearHighlight } from '../render/index.js';
import { highlightTableRowByNodeId, clearTableRowHoverHighlight } from '../ui/index.js';

/**
 * Handles the mouseover event on a node to trigger highlighting.
 * @param {object} event - The mouse event.
 * @param {object} d - The node data.
 * @param {d3.Selection} g - The main D3 group element.
 * @param {Array<object>} links - The array of all links.
 */
export function handleMouseOver(event, d, g, links) {
    renderHighlight(g, d, links);
    highlightTableRowByNodeId(d.id);
}

/**
 * Handles the mouseout event on a node to clear highlighting.
 * @param {d3.Selection} g - The main D3 group element.
 */
export function handleMouseOut(g) {
    renderClearHighlight(g);
    clearTableRowHoverHighlight();
}