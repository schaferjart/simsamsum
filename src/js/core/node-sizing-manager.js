/**
 * @module core/node-sizing-manager
 * Manages all node sizing functionality including calculation, extent computation,
 * and application of sizes based on data columns.
 */

import { calculateNodeSize } from '../utils.js';

/**
 * Node Sizing Manager
 * Handles dynamic node sizing based on data column values.
 */
export class NodeSizingManager {
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled !== false,
            column: config.column || 'incomingVolume',
            minValue: config.minValue ?? null,
            maxValue: config.maxValue ?? null,
            minSize: config.minSize || 24,
            maxSize: config.maxSize || 90,
            baseSize: config.baseSize || 40,
            zeroSize: config.zeroSize || 10
        };
    }

    /**
     * Gets the configuration for data processing.
     * @returns {object} Sizing configuration object
     */
    getProcessDataSizingConfig() {
        if (!this.config.enabled) {
            return { baseSize: this.config.baseSize };
        }
        return {
            baseSize: this.config.baseSize,
            enabled: true,
            column: this.config.column
        };
    }

    /**
     * Gets the value from a node for the sizing column.
     * @param {object} node - The node object
     * @param {string} column - The column name
     * @returns {number|null} The numeric value or null
     */
    getNodeValueForSizing(node, column) {
        if (!node || !column) return null;
        const value = node[column];
        if (value === null || value === undefined || value === '') return null;
        const num = typeof value === 'number' ? value : parseFloat(value);
        return !isNaN(num) ? num : null;
    }

    /**
     * Recomputes the min/max extents based on current nodes.
     * @param {Array<object>} nodes - Array of nodes to analyze
     */
    recomputeNodeSizingExtents(nodes) {
        if (!this.config.enabled || !nodes || nodes.length === 0) {
            this.config.minValue = null;
            this.config.maxValue = null;
            return;
        }

        const column = this.config.column;
        const values = [];

        for (const node of nodes) {
            const val = this.getNodeValueForSizing(node, column);
            if (val !== null && val !== undefined) {
                values.push(val);
            }
        }

        if (values.length === 0) {
            this.config.minValue = null;
            this.config.maxValue = null;
            return;
        }

        this.config.minValue = Math.min(...values);
        this.config.maxValue = Math.max(...values);

        console.log(`📏 Node sizing extents for "${column}": min=${this.config.minValue}, max=${this.config.maxValue}`);
    }

    /**
     * Applies sizing to nodes based on the current configuration.
     * @param {Array<object>} nodes - Array of nodes to apply sizing to
     */
    applyNodeSizingToNodes(nodes) {
        if (!nodes || nodes.length === 0) return;

        for (const node of nodes) {
            const value = this.config.column ? this.getNodeValueForSizing(node, this.config.column) : null;
            node.size = calculateNodeSize(value, this.config);
        }
    }

    /**
     * Refreshes node sizing by recomputing extents and applying sizes.
     * @param {Array<object>} nodes - Array of nodes to refresh
     */
    refreshNodeSizing(nodes) {
        this.recomputeNodeSizingExtents(nodes);
        this.applyNodeSizingToNodes(nodes);
    }

    /**
     * Gets the display name for a size column.
     * @param {string} columnId - The column ID
     * @param {Array<object>} availableColumns - Available column definitions
     * @returns {string} The display name
     */
    getSizeColumnDisplayName(columnId, availableColumns = []) {
        if (!columnId) return 'Unknown';
        const col = availableColumns.find(c => c.id === columnId);
        return col ? col.name : columnId;
    }

    /**
     * Updates the sizing configuration.
     * @param {object} updates - Partial configuration updates
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }

    /**
     * Gets the current configuration.
     * @returns {object} Current sizing configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Enables or disables node sizing.
     * @param {boolean} enabled - Whether sizing should be enabled
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }

    /**
     * Sets the sizing column.
     * @param {string} column - The column ID to use for sizing
     */
    setColumn(column) {
        this.config.column = column;
    }
}
