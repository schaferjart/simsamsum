/**
 * Selection Manager for multi-select functionality
 * Handles selection state and operations for multiple nodes
 */

export class SelectionManager {
    constructor() {
        this.selectedNodes = new Set();
        this.isMultiSelectMode = false;
        this.lastSelectedId = null;
    }

    /**
     * Toggle selection of a node
     * @param {string} nodeId - The ID of the node to toggle
     */
    toggleSelection(nodeId) {
        if (this.selectedNodes.has(nodeId)) {
            this.selectedNodes.delete(nodeId);
        } else {
            this.selectedNodes.add(nodeId);
            this.lastSelectedId = nodeId;
        }
    }

    /**
     * Select a single node (clear others)
     * @param {string} nodeId - The ID of the node to select
     */
    selectSingle(nodeId) {
        this.selectedNodes.clear();
        this.selectedNodes.add(nodeId);
        this.lastSelectedId = nodeId;
    }

    /**
     * Select multiple nodes
     * @param {Array<string>} nodeIds - Array of node IDs to select
     */
    selectMultiple(nodeIds) {
        nodeIds.forEach(id => this.selectedNodes.add(id));
        if (nodeIds.length > 0) {
            this.lastSelectedId = nodeIds[nodeIds.length - 1];
        }
    }

    /**
     * Select all nodes
     * @param {Array<string>} allNodeIds - Array of all available node IDs
     */
    selectAll(allNodeIds) {
        this.selectedNodes = new Set(allNodeIds);
        if (allNodeIds.length > 0) {
            this.lastSelectedId = allNodeIds[allNodeIds.length - 1];
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedNodes.clear();
        this.lastSelectedId = null;
    }

    /**
     * Check if a node is selected
     * @param {string} nodeId - The ID of the node to check
     * @returns {boolean} True if the node is selected
     */
    isSelected(nodeId) {
        return this.selectedNodes.has(nodeId);
    }

    /**
     * Get all selected node IDs as an array
     * @returns {Array<string>} Array of selected node IDs
     */
    getSelectedIds() {
        return Array.from(this.selectedNodes);
    }

    /**
     * Get the count of selected nodes
     * @returns {number} Number of selected nodes
     */
    getSelectionCount() {
        return this.selectedNodes.size;
    }

    /**
     * Select nodes within a rectangular area
     * @param {Array<Object>} nodes - All nodes to check
     * @param {number} x1 - Rectangle left
     * @param {number} y1 - Rectangle top
     * @param {number} x2 - Rectangle right
     * @param {number} y2 - Rectangle bottom
     * @param {boolean} addToSelection - Whether to add to existing selection or replace
     */
    selectInRect(nodes, x1, y1, x2, y2, addToSelection = false) {
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);

        if (!addToSelection) {
            this.clearSelection();
        }

        nodes.forEach(node => {
            if (node.x >= left && node.x <= right && node.y >= top && node.y <= bottom) {
                this.selectedNodes.add(node.id);
            }
        });
    }

    /**
     * Handle range selection between two nodes (for Shift+click)
     * @param {Array<Object>} nodes - All nodes
     * @param {string} startNodeId - Starting node ID
     * @param {string} endNodeId - Ending node ID
     */
    selectRange(nodes, startNodeId, endNodeId) {
        const startIndex = nodes.findIndex(n => n.id === startNodeId);
        const endIndex = nodes.findIndex(n => n.id === endNodeId);
        
        if (startIndex !== -1 && endIndex !== -1) {
            const minIndex = Math.min(startIndex, endIndex);
            const maxIndex = Math.max(startIndex, endIndex);
            
            for (let i = minIndex; i <= maxIndex; i++) {
                this.selectedNodes.add(nodes[i].id);
            }
        }
    }
}
