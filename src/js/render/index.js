/**
 * @module render
 * Barrel export for the render module.
 * This file re-exports all public APIs from the render sub-modules to maintain
 * compatibility with the original `render.js` module and to provide a single
 * entry point for all rendering functionality.
 */

import { renderLinks, updateLinkPaths } from './link-renderer.js';
import { renderNodes, updateNodePositions } from './node-renderer.js';
import { renderLabels } from './label-renderer.js';

// Main setup
export { initVisualization } from './svg-setup.js';

// Core rendering and position updates
export function renderVisualizationElements(g, nodes, links, currentLayout, eventHandlers) {
    g.selectAll('*').remove();
    renderLinks(g, links, currentLayout);
    const nodeGroups = renderNodes(g, nodes, currentLayout, eventHandlers);
    renderLabels(g, nodeGroups);
}

export function updatePositions(g) {
    updateNodePositions(g);
    updateLinkPaths(g);
}

// Visual feedback and updates
export {
    highlightNode,
    clearHighlight,
    updateSelectionVisuals,
    highlightNodeById,
    createSelectionRect
} from './visual-updates.js';

// Grid rendering
export { updateGridDisplay } from './grid-renderer.js';

// Text transformations
export { updateTextRotation } from './text-transforms.js';