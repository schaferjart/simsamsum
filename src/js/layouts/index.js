/**
 * @module layouts
 * Barrel export for the layouts module. This module provides a single entry point
 * for applying different graph layouts to the visualization.
 */
import { linkify } from './layout-utils.js';
import { applyForceLayout } from './force-layout.js';
import { applyHierarchicalLayout, applyHierarchicalOrthogonalLayout } from './hierarchical-layout.js';
import { applyCircularLayout } from './circular-layout.js';
import { applyGridLayout, applyManualGridLayout } from './grid-layout.js';

/**
 * Applies the selected layout to the graph by dispatching to the appropriate layout function.
 * @param {string} layoutType - The type of layout to apply (e.g., 'force', 'hierarchical').
 * @param {object} state - The current state of the visualization, containing nodes, links, etc.
 * @returns {d3.Simulation|null} The configured D3 simulation for the layout, or null if the layout is static.
 */
export function applyLayout(layoutType, state) {
    console.log(`Applying layout: ${layoutType}`);
    const { nodes, links, width, height } = state;
    const gridSize = state.gridManager?.getSize?.() ?? state.gridSize ?? 50;

    // Stop any existing simulation before applying a new layout
    if (state.simulation) {
        state.simulation.stop();
    }

    // Ensure links are object references, a required preprocessing step for all layouts
    linkify(links, nodes);

    switch (layoutType) {
        case 'force':
            return applyForceLayout(nodes, links, width, height);
        case 'hierarchical':
            return applyHierarchicalLayout(nodes, links, width, height);
        case 'hierarchical-orthogonal':
            applyHierarchicalOrthogonalLayout(nodes, links, width, height);
            return null; // This layout is static and does not use a simulation
        case 'circular':
            return applyCircularLayout(nodes, width, height);
        case 'grid':
            return applyGridLayout(nodes, width, height);
        case 'manual-grid':
            applyManualGridLayout(nodes, gridSize);
            return null; // This layout is static and does not use a simulation
        default:
            console.warn(`Unknown layout type "${layoutType}". Defaulting to force layout.`);
            return applyForceLayout(nodes, links, width, height);
    }
}