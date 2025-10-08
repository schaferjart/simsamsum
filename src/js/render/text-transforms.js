/**
 * @module render/text-transforms
 * This module contains utility functions for text transformations, such as rotation,
 * to ensure readability within the visualization.
 */

/**
 * Updates the rotation of text elements to counteract the graph's rotation,
 * keeping the labels upright and readable.
 * @param {d3.Selection} g - The main D3 group element containing the text elements.
 * @param {number} graphRotation - The current rotation of the graph in degrees.
 * @param {object} graphTransform - The current transform object, containing scaleX and scaleY.
 */
export function updateTextRotation(g, graphRotation, graphTransform) {
    if (!g) return;
    const counterRotation = -graphRotation;
    const textScaleX = graphTransform.scaleX < 0 ? -1 : 1;
    const textScaleY = graphTransform.scaleY < 0 ? -1 : 1;

    g.selectAll('.node-label, .supplementary-info')
        .transition()
        .duration(300)
        .attr('transform', `rotate(${counterRotation}) scale(${textScaleX}, ${textScaleY})`);
}