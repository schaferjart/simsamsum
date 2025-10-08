/**
 * @module render/grid-renderer
 * This module is responsible for rendering and managing the background grid overlay.
 */

/**
 * Updates the display of the grid overlay. It can create or remove the grid lines.
 * @param {d3.Selection} svg - The main SVG selection.
 * @param {boolean} showGrid - Whether to show the grid.
 * @param {number} width - The width of the SVG container.
 * @param {number} height - The height of the SVG container.
 * @param {number} gridSize - The size of the grid cells.
 */
export function updateGridDisplay(svg, showGrid, width, height, gridSize) {
    if (!svg) return;
    svg.selectAll('.grid-overlay').remove();
    if (!showGrid) return;

    const gridGroup = svg.insert('g', ':first-child').attr('class', 'grid-overlay');

    for (let x = 0; x <= width; x += gridSize) {
        gridGroup.append('line')
            .attr('class', 'grid-line')
            .attr('x1', x).attr('y1', 0)
            .attr('x2', x).attr('y2', height)
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', x % (gridSize * 4) === 0 ? 1 : 0.5)
            .attr('opacity', 0.5);
    }

    for (let y = 0; y <= height; y += gridSize) {
        gridGroup.append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0).attr('y1', y)
            .attr('x2', width).attr('y2', y)
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', y % (gridSize * 4) === 0 ? 1 : 0.5)
            .attr('opacity', 0.5);
    }
}