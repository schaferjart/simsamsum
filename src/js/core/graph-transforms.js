import * as d3 from 'd3';
import { updateTextRotation } from '../render/index.js';
import { showStatus } from '../utils.js';

/**
 * Calculates the bounding box of the currently displayed nodes.
 * @param {Array<Object>} nodes - The array of nodes to calculate bounds for.
 * @returns {{minX: number, maxX: number, minY: number, maxY: number}|null} The bounding box or null if no nodes.
 */
function calculateGraphBounds(nodes) {
    if (nodes.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
            minX = Math.min(minX, node.x - (node.size || 0));
            maxX = Math.max(maxX, node.x + (node.size || 0));
            minY = Math.min(minY, node.y - (node.size || 0));
            maxY = Math.max(maxY, node.y + (node.size || 0));
        }
    });
    return minX === Infinity ? null : { minX, maxX, minY, maxY };
}

/**
 * Applies the current rotation and scale transformations to the main graph group.
 * @param {object} state - The application state object.
 */
function applyGraphTransform(state) {
    if (!state.g) return;
    const bounds = calculateGraphBounds(state.nodes);
    const centerX = bounds ? (bounds.minX + bounds.maxX) / 2 : state.width / 2;
    const centerY = bounds ? (bounds.minY + bounds.maxY) / 2 : state.height / 2;
    const transform = `translate(${centerX}, ${centerY}) rotate(${state.graphRotation}) scale(${state.graphTransform.scaleX}, ${state.graphTransform.scaleY}) translate(${-centerX}, ${-centerY})`;
    state.g.transition().duration(300).attr('transform', transform);
    updateTextRotation(state.g, state.graphRotation, state.graphTransform);
}

/**
 * Rotates the graph by a given number of degrees.
 * @param {object} state - The application state object.
 * @param {number} degrees - The number of degrees to rotate (e.g., 90 or -90).
 */
export function rotateGraph(state, degrees) {
    state.graphRotation += degrees;
    applyGraphTransform(state);
    showStatus(`Graph rotated ${degrees > 0 ? 'right' : 'left'}`, 'info');
}

/**
 * Flips the graph horizontally or vertically.
 * @param {object} state - The application state object.
 * @param {string} direction - The direction to flip ('horizontal' or 'vertical').
 */
export function flipGraph(state, direction) {
    if (direction === 'horizontal') state.graphTransform.scaleX *= -1;
    if (direction === 'vertical') state.graphTransform.scaleY *= -1;
    applyGraphTransform(state);
    showStatus(`Graph flipped ${direction}ly`, 'info');
}

/**
 * Resets the zoom and pan to center the graph.
 * @param {object} state - The application state object.
 */
export function centerGraph(state) {
    if (!state.svg || !state.zoom || !state.nodes?.length) {
        if (state.svg && state.zoom) {
            state.svg.transition().duration(750).call(state.zoom.transform, d3.zoomIdentity);
            showStatus('Graph centered', 'info');
        }
        return;
    }

    const bounds = calculateGraphBounds(state.nodes);
    if (!bounds) {
        state.svg.transition().duration(750).call(state.zoom.transform, d3.zoomIdentity);
        showStatus('Graph centered', 'info');
        return;
    }

    const currentTransform = d3.zoomTransform(state.svg.node());
    const scale = currentTransform.k || 1;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const target = d3.zoomIdentity
        .translate(state.width / 2, state.height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);

    state.svg.transition().duration(750).call(state.zoom.transform, target);
    showStatus('Graph centered', 'info');
}

/**
 * Adjusts the zoom and pan to fit the entire graph within the viewport.
 * @param {object} state - The application state object.
 */
export function fitToScreen(state) {
    if (!state.g || state.nodes.length === 0) return;
    const bounds = calculateGraphBounds(state.nodes);
    if (!bounds) return;
    const padding = 50;
    const scale = Math.min(
        (state.width - padding * 2) / (bounds.maxX - bounds.minX),
        (state.height - padding * 2) / (bounds.maxY - bounds.minY),
        2
    );
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const transform = d3.zoomIdentity
        .translate(state.width / 2, state.height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);
    state.svg.transition().duration(750).call(state.zoom.transform, transform);
    showStatus('Graph fitted to screen', 'info');
}