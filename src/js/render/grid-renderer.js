/**
 * @module render/grid-renderer
 * This module is responsible for rendering and managing the background grid overlay.
 */

/**
 * Updates the display of the grid overlay. It can create or remove the grid points.
 * Creates a dynamic grid based on actual node positions for optimal performance.
 * @param {d3.Selection} g - The main D3 group element (transformed group for zoom/pan).
 * @param {boolean} showGrid - Whether to show the grid.
 * @param {number} width - The width of the SVG container.
 * @param {number} height - The height of the SVG container.
 * @param {number} gridSize - The size of the grid cells.
 * @param {Array<object>} nodes - Array of nodes to calculate bounds from.
 */
export function updateGridDisplay(g, showGrid, width, height, gridSize, nodes = []) {
    if (!g) return;
    g.selectAll('.grid-overlay').remove();
    if (!showGrid) return;

    const gridGroup = g.insert('g', ':first-child').attr('class', 'grid-overlay');

    // Calculate bounding box from actual node positions
    let minX = 0;
    let maxX = width;
    let minY = 0;
    let maxY = height;

    if (nodes && nodes.length > 0) {
        // Find the actual bounds of all nodes
        const nodePositions = nodes.filter(n => n.x !== undefined && n.y !== undefined);
        
        if (nodePositions.length > 0) {
            minX = Math.min(...nodePositions.map(n => n.x));
            maxX = Math.max(...nodePositions.map(n => n.x));
            minY = Math.min(...nodePositions.map(n => n.y));
            maxY = Math.max(...nodePositions.map(n => n.y));
            
            // Add fixed 500px padding in each direction for workspace
            const padding = 500;
            
            minX -= padding;
            maxX += padding;
            minY -= padding;
            maxY += padding;
        }
    } else {
        // Fallback: use viewport with some extension
        const extension = Math.max(width, height);
        minX = -extension;
        maxX = width + extension;
        minY = -extension;
        maxY = height + extension;
    }

    // Snap to grid boundaries
    minX = Math.floor(minX / gridSize) * gridSize;
    maxX = Math.ceil(maxX / gridSize) * gridSize;
    minY = Math.floor(minY / gridSize) * gridSize;
    maxY = Math.ceil(maxY / gridSize) * gridSize;

    // Create grid intersection points
    let pointCount = 0;
    for (let x = minX; x <= maxX; x += gridSize) {
        for (let y = minY; y <= maxY; y += gridSize) {
            // Create a small circle at each grid intersection
            const isMainGridPoint = (x % (gridSize * 4) === 0) && (y % (gridSize * 4) === 0);
            gridGroup.append('circle')
                .attr('class', 'grid-point')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', isMainGridPoint ? 3 : 1.5)
                .attr('opacity', isMainGridPoint ? 0.6 : 0.3);
            pointCount++;
        }
    }
    
    console.log(`✨ Grid rendered: ${pointCount} points, bounds: [${minX},${minY}] to [${maxX},${maxY}]`);
}