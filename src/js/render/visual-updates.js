/**
 * @module render/visual-updates
 * This module contains functions for applying visual updates to the graph,
 * such as highlighting, selection, and other state-driven visual changes.
 */
import * as d3 from 'd3';

/**
 * Highlights a node and its connected links and nodes.
 * @param {d3.Selection} g - The main D3 group element.
 * @param {object} selectedNode - The node object to highlight.
 * @param {Array<Object>} links - The array of all links in the graph.
 */
export function highlightNode(g, selectedNode, links) {
    if (!g) return;
    const connectedNodes = new Set([selectedNode.id]);
    links.forEach(link => {
        if (link.source.id === selectedNode.id || link.source === selectedNode.id) {
            connectedNodes.add(link.target.id || link.target);
        }
        if (link.target.id === selectedNode.id || link.target === selectedNode.id) {
            connectedNodes.add(link.source.id || link.source);
        }
    });

    g.selectAll('.node')
        .classed('highlighted', d => d.id === selectedNode.id)
        .classed('dimmed', d => !connectedNodes.has(d.id));

    g.selectAll('.link')
        .classed('highlighted', d => (d.source.id || d.source) === selectedNode.id || (d.target.id || d.target) === selectedNode.id)
        .classed('dimmed', d => !((d.source.id || d.source) === selectedNode.id || (d.target.id || d.target) === selectedNode.id));

    g.selectAll('.node-label, .supplementary-info')
        .classed('dimmed', d => !connectedNodes.has(d.id));
}

/**
 * Clears all highlighting from the graph.
 * @param {d3.Selection} g - The main D3 group element.
 */
export function clearHighlight(g) {
    if (!g) return;
    g.selectAll('.node, .link, .node-label, .supplementary-info')
        .classed('highlighted', false)
        .classed('dimmed', false);
}

/**
 * Updates the visual selection state for nodes based on a set of selected IDs.
 * @param {d3.Selection} g - The main D3 group element.
 * @param {Set<string>} selectedNodeIds - A set of IDs of the currently selected nodes.
 */
export function updateSelectionVisuals(g, selectedNodeIds) {
    if (!g) return;

    const nodes = g.selectAll('.node');
    const isSelected = (d) => selectedNodeIds.has(d.id);

    nodes.classed('selected', isSelected);

    nodes.selectAll('path, rect, circle, ellipse, polygon, polyline')
        .each(function (d) {
            const selection = d3.select(this);
            if (isSelected(d)) {
                selection
                    .attr('stroke', '#007bff')
                    .attr('stroke-width', 3);
            } else {
                const baseStroke = selection.attr('data-base-stroke');
                const baseStrokeWidth = selection.attr('data-base-stroke-width');
                selection
                    .attr('stroke', baseStroke ?? null)
                    .attr('stroke-width', baseStrokeWidth ?? null);
            }
        });

    const anySelected = selectedNodeIds && selectedNodeIds.size > 0;
    g.selectAll('.link')
        .classed('selected', d => anySelected && (selectedNodeIds.has(d.source?.id ?? d.source) || selectedNodeIds.has(d.target?.id ?? d.target)))
        .classed('dimmed', d => anySelected && !(selectedNodeIds.has(d.source?.id ?? d.source) || selectedNodeIds.has(d.target?.id ?? d.target)));

    g.selectAll('.node-label, .supplementary-info')
        .classed('dimmed', d => anySelected && !selectedNodeIds.has(d.id));
}

/**
 * Highlights a single node by its ID, typically used to show selection from an external source like a table.
 * @param {d3.Selection} g - The main D3 group element.
 * @param {string} nodeId - The ID of the node to highlight.
 */
export function highlightNodeById(g, nodeId) {
    if (!g) return;
    g.selectAll('.node')
        .classed('table-highlight', d => d.id === nodeId);
}

/**
 * Creates and appends a selection rectangle to the SVG.
 * @param {d3.Selection} g - The main D3 group element.
 * @param {number} x - The x-coordinate of the rectangle.
 * @param {number} y - The y-coordinate of the rectangle.
 * @param {number} width - The width of the rectangle.
 * @param {number} height - The height of the rectangle.
 * @returns {d3.Selection} The created rectangle element.
 */
export function createSelectionRect(g, x, y, width, height) {
    return g.append('rect')
        .attr('class', 'selection-rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'rgba(0, 123, 255, 0.1)')
        .attr('stroke', '#007bff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5');
}