/**
 * @module core/grid-manager
 * Manages grid display and snapping functionality for the visualization.
 */

/**
 * Grid Manager
 * Handles grid visibility, size changes, and node snapping.
 */
export class GridManager {
    constructor(config = {}) {
        this.gridSize = config.gridSize || 50;
        this.showGrid = config.showGrid !== false;
    }

    /**
     * Toggles the grid visibility.
     * @returns {boolean} New grid visibility state
     */
    toggleGrid() {
        this.showGrid = !this.showGrid;
        return this.showGrid;
    }

    /**
     * Snaps all nodes to the current grid.
     * @param {Array<object>} nodes - Array of nodes to snap
     */
    snapAllToGrid(nodes) {
        if (!nodes || nodes.length === 0) return;

        for (const node of nodes) {
            if (node.x !== undefined && node.y !== undefined) {
                node.x = Math.round(node.x / this.gridSize) * this.gridSize;
                node.y = Math.round(node.y / this.gridSize) * this.gridSize;
                node.fx = node.x;
                node.fy = node.y;
            }
        }
    }

    /**
     * Updates the grid size and optionally snaps nodes.
     * @param {number} newSize - New grid size
     * @param {Array<object>} nodes - Optional array of nodes to snap
     */
    updateGridSize(newSize, nodes = null) {
        this.gridSize = newSize;
        if (nodes) {
            this.snapAllToGrid(nodes);
        }
    }

    /**
     * Gets the current grid configuration.
     * @returns {object} Grid configuration
     */
    getConfig() {
        return {
            gridSize: this.gridSize,
            showGrid: this.showGrid
        };
    }

    /**
     * Sets the grid visibility.
     * @param {boolean} visible - Whether grid should be visible
     */
    setVisible(visible) {
        this.showGrid = visible;
    }

    /**
     * Gets the current grid size.
     * @returns {number} Grid size
     */
    getSize() {
        return this.gridSize;
    }

    /**
     * Checks if grid is visible.
     * @returns {boolean} Grid visibility state
     */
    isVisible() {
        return this.showGrid;
    }
}
