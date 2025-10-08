/**
 * @module layouts/grid-layout
 * This module contains the logic for applying grid-based layouts, both automatic and manual.
 */
import * as d3 from 'd3';

/**
 * Initializes the positions of nodes for a manual grid layout if they are not already set.
 * @param {Array<Object>} nodes - The array of nodes to position.
 * @param {number} gridSize - The grid size to determine spacing.
 * @private
 */
function initializeManualLayout(nodes, gridSize) {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacing = gridSize * 4;
    const startX = 100;
    const startY = 100;

    nodes.forEach((node, i) => {
        // Only set position if it's not already defined (using Number.isFinite to reject NaN)
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            node.x = startX + col * spacing;
            node.y = startY + row * spacing;
            node.fx = node.x;
            node.fy = node.y;
        }
    });
}

/**
 * Applies a standard grid layout, arranging nodes in a uniform grid.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @returns {d3.Simulation} A D3 simulation configured for collision detection.
 */
export function applyGridLayout(nodes, width, height) {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    const padding = 50;
    const cellWidth = (width - padding * 2) / Math.max(1, cols);
    const cellHeight = (height - padding * 2) / Math.max(1, rows);

    nodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        node.fx = padding + cellWidth * (col + 0.5);
        node.fy = padding + cellHeight * (row + 0.5);
    });

    // Return a simulation for collision detection
    return d3.forceSimulation(nodes)
        .force('collision', d3.forceCollide().radius(d => d.size + 10))
        .alpha(0.3);
}

/**
 * Applies a manual grid layout where nodes are fixed but can be dragged.
 * It ensures nodes have an initial position if they lack one.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {number} gridSize - The size of the grid for initial placement.
 */
export function applyManualGridLayout(nodes, gridSize) {
    console.log('🎯 Applying manual grid layout...');
    // Initial placement if no position is set (using Number.isFinite to properly detect NaN)
    if (nodes.some(n => !Number.isFinite(n.x) || !Number.isFinite(n.y))) {
        initializeManualLayout(nodes, gridSize);
    }
    // Fix the positions of all nodes
    nodes.forEach(node => {
        node.fx = node.x;
        node.fy = node.y;
    });
}