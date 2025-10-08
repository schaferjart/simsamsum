/**
 * @module layouts/circular-layout
 * This module contains the logic for applying a circular layout to the graph.
 */
import * as d3 from 'd3';

/**
 * Applies a circular layout, arranging nodes in a circle.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @returns {d3.Simulation} A D3 simulation configured for collision detection.
 */
export function applyCircularLayout(nodes, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length;
        node.fx = centerX + radius * Math.cos(angle);
        node.fy = centerY + radius * Math.sin(angle);
    });

    // Return a simulation just for collision detection to prevent overlaps
    return d3.forceSimulation(nodes)
        .force('collision', d3.forceCollide().radius(d => d.size + 10))
        .alpha(0.3);
}