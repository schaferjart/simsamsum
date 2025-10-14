/**
 * @module render/node-renderer
 * This module is responsible for rendering the nodes in the visualization,
 * including their shapes, styles, and attaching event handlers.
 */
import * as d3 from 'd3';
import { drawNodeShape } from './shape-library.js';

/**
 * Renders the nodes in the SVG container.
 * @param {d3.Selection} g - The main D3 group element for rendering.
 * @param {Array<Object>} nodes - The array of node data.
 * @param {string} currentLayout - The current layout type.
 * @param {object} eventHandlers - An object containing event handlers for node interactions.
 */
export function renderNodes(g, nodes, currentLayout, eventHandlers) {
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .attr('class', d => {
            let classes = (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') ? 'node draggable' : 'node';
            if (d.filterStyle) {
                if (d.filterStyle.highlighted) classes += ' highlighted';
                if (d.filterStyle.dimmed) classes += ' dimmed';
            }
            return classes;
        })
        .call(d3.drag()
            .on('start', eventHandlers.dragStarted)
            .on('drag', eventHandlers.dragged)
            .on('end', eventHandlers.dragEnded));

    node.on('click', eventHandlers.nodeClicked);
    node.on('mouseover', eventHandlers.nodeMouseOver)
        .on('mouseout', eventHandlers.nodeMouseOut);

    // Node shapes
    node.each(function (d) {
        const nodeGroup = d3.select(this);

        const styleOverrides = {
            fillColor: d.customStyle?.color,
            strokeColor: d.customStyle?.strokeColor,
            strokeWidth: d.customStyle?.strokeWidth,
            borderStyle: d.borderStyle
        };

        drawNodeShape(nodeGroup, d, styleOverrides);
    });
}

/**
 * Updates the positions of the nodes.
 * @param {d3.Selection} g - The main D3 group element.
 */
export function updateNodePositions(g) {
    if (!g) return;
    g.selectAll('.node').attr('transform', d => `translate(${d.x},${d.y})`);
}