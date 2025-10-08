/**
 * @module render/node-renderer
 * This module is responsible for rendering the nodes in the visualization,
 * including their shapes, styles, and attaching event handlers.
 */
import * as d3 from 'd3';

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
        const size = Math.max(10, d.size || 30);
        const borderStyle = d.borderStyle;

        let shape;
        switch (d.Type) {
            case 'Resource':
                shape = nodeGroup.append('rect')
                    .attr('width', size * 1.2)
                    .attr('height', size * 0.8)
                    .attr('x', -size * 0.6)
                    .attr('y', -size * 0.4);
                break;
            case 'Action':
                const triangleSize = size * 0.8;
                shape = nodeGroup.append('path')
                    .attr('d', `M0,${-triangleSize} L${triangleSize * 0.866},${triangleSize * 0.5} L${-triangleSize * 0.866},${triangleSize * 0.5} Z`);
                break;
            case 'State':
                shape = nodeGroup.append('circle')
                    .attr('r', Math.max(5, size * 0.6));
                break;
            case 'Decision':
                const diamondSize = size * 0.7;
                shape = nodeGroup.append('path')
                    .attr('d', `M0,${-diamondSize} L${diamondSize},0 L0,${diamondSize} L${-diamondSize},0 Z`);
                break;
            default:
                shape = nodeGroup.append('circle')
                    .attr('r', Math.max(5, size * 0.6));
        }

        shape.attr('fill', (d.customStyle && d.customStyle.color) || 'rgba(255, 255, 255, 0.8)')
            .attr('stroke', '#000000')
            .attr('stroke-width', (d.customStyle && d.customStyle.strokeWidth) || 2)
            .attr('stroke-dasharray', borderStyle);
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