import * as d3 from 'd3';
import { snapToGrid } from './utils.js';
import { highlightNode as renderHighlight, clearHighlight as renderClearHighlight } from './render.js';
import { highlightTableRowByNodeId } from './ui.js';

/**
 * Handles the start of a drag event on a node.
 * @param {object} event - The D3 drag event.
 * @param {object} d - The node data.
 * @param {object} simulation - The D3 simulation instance.
 * @param {string} currentLayout - The current layout type.
 */
export function dragStarted(event, d, simulation, currentLayout) {
    console.log(`🔥 Drag started for node: ${d.id}, layout: ${currentLayout}`);
    if (currentLayout !== 'manual-grid') {
        // Safely kick the simulation only if it exists
        if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
}

/**
 * Handles the dragging of a node.
 * @param {object} event - The D3 drag event.
 * @param {object} d - The node data.
 * @param {string} currentLayout - The current layout type.
 * @param {number} gridSize - The grid size for snapping.
 */
export function dragged(event, d, currentLayout, gridSize) {
    if (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') {
        // In manual-grid or orthogonal (no simulation), update absolute positions directly with grid snap
    const snapped = snapToGrid(event.x, event.y, gridSize);
    d.x = snapped.x;
    d.y = snapped.y;
    // Keep fixed coords in sync so subsequent renders/layouts respect the position
    d.fx = d.x;
    d.fy = d.y;
    } else {
        d.fx = event.x;
        d.fy = event.y;
    }
}

/**
 * Handles the end of a drag event on a node.
 * @param {object} event - The D3 drag event.
 * @param {object} d - The node data.
 * @param {object} simulation - The D3 simulation instance.
 * @param {string} currentLayout - The current layout type.
 */
export function dragEnded(event, d, simulation, currentLayout) {
    if (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') {
        // Keep position fixed in manual mode
    d.fx = d.x;
    d.fy = d.y;
    } else {
        if (simulation && !event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

/**
 * Handle node click to also highlight selection in the editor tables.
 * This function can be used in the nodeClicked handler in core.
 * @param {Event} event
 * @param {object} d
 */
export function handleNodeClickSelection(event, d) {
    try {
        highlightTableRowByNodeId(d.id);
    } catch(e) {
        // no-op if table not present
    }
}

/**
 * Applies search and filter criteria to the node set.
 * @param {string} searchQuery - The search query string.
 * @param {string} typeFilter - The selected type filter.
 * @param {string} executionFilter - The selected execution filter.
 * @param {Array<Object>} allNodes - The complete list of nodes.
 * @param {Array<Object>} allLinks - The complete list of links.
 * @returns {{filteredNodes: Array<Object>, filteredLinks: Array<Object>}}
 */
export function applyFilters(searchQuery, typeFilter, executionFilter, allNodes, allLinks) {
    let filteredNodes = [...allNodes];

    if (searchQuery) {
        filteredNodes = filteredNodes.filter(node =>
            node.Name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (typeFilter) {
        filteredNodes = filteredNodes.filter(node => node.Type === typeFilter);
    }

    if (executionFilter) {
        filteredNodes = filteredNodes.filter(node => node.Execution === executionFilter);
    }

    const filteredIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = allLinks.filter(link =>
        filteredIds.has(link.source.id || link.source) &&
        filteredIds.has(link.target.id || link.target)
    );

    return { filteredNodes, filteredLinks };
}

/**
 * Handles highlighting a node and its connections.
 * @param {d3.Selection} g - The main D3 group for rendering.
 * @param {object} selectedNode - The node to highlight.
 * @param {Array<Object>} links - The array of all links.
 */
export function highlightNode(g, selectedNode, links) {
    renderHighlight(g, selectedNode, links);
}

/**
 * Clears all node and link highlighting.
 * @param {d3.Selection} g - The main D3 group for rendering.
 */
export function clearHighlight(g) {
    renderClearHighlight(g);
}

/**
 * Handles the zoom event from D3.
 * @param {object} event - The D3 zoom event.
 * @param {d3.Selection} zoomGroup - The D3 group to apply the transform to.
 */
export function handleZoom(event, zoomGroup) {
    zoomGroup.attr('transform', event.transform);
}

/**
 * Handles window resize events.
 * @param {object} state - The application state.
 * @param {d3.Selection} svg - The main SVG element.
 */
export function handleResize(state, svg) {
    const container = document.getElementById('networkGraph');
    state.width = container.clientWidth;
    state.height = container.clientHeight;

    svg.attr('width', state.width).attr('height', state.height);

    if (state.simulation) {
        state.simulation.force('center', d3.forceCenter(state.width / 2, state.height / 2));
        state.simulation.alpha(0.3).restart();
    }
}