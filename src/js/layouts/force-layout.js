/**
 * @module layouts/force-layout
 * This module contains the logic for applying a force-directed graph layout.
 */
import * as d3 from 'd3';

/**
 * Applies a force-directed layout using D3's force simulation.
 * This layout simulates physical forces between nodes, where links act as springs
 * and nodes repel each other.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {Array<Object>} links - The array of links.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @returns {d3.Simulation} The configured D3 simulation instance.
 */
export function applyForceLayout(nodes, links, width, height) {
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150).strength(0.8))
        .force('charge', d3.forceManyBody().strength(-600))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.size + 10));

    // Restart the simulation with high alpha to ensure it runs
    simulation.alpha(1).restart();

    return simulation;
}