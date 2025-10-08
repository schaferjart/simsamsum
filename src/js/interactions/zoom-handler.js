/**
 * @module interactions/zoom-handler
 * This module manages zoom and pan interactions for the visualization.
 */
import * as d3 from 'd3';

/**
 * Handles D3 zoom events, applying the transform to the zoom group.
 * @param {object} event - The D3 zoom event.
 * @param {d3.Selection} zoomGroup - The group element to which the zoom transform should be applied.
 */
export function handleZoom(event, zoomGroup) {
    if (!zoomGroup) return;

    const { transform } = event;
    zoomGroup.attr('transform', transform);
}

/**
 * Handles window resize events to keep the SVG and layout responsive.
 * @param {object} state - The application's state object, containing width, height, simulation, etc.
 * @param {d3.Selection} svg - The main SVG element.
 */
export function handleResize(state, svg) {
    const container = document.getElementById('networkGraph');
    if (!container || !svg) return;

    state.width = container.clientWidth;
    state.height = container.clientHeight;
    svg.attr('width', state.width).attr('height', state.height);

    // Recenter the force simulation if it's active
    if (state.simulation) {
        state.simulation.force('center', d3.forceCenter(state.width / 2, state.height / 2));
        state.simulation.alpha(0.15).restart();
    }
}