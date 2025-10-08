/**
 * @module interactions/drag-handler
 * This module manages all drag-and-drop functionality for nodes.
 */
import { snapToGrid } from '../utils.js';
import * as d3 from 'd3';

// Drag state management
const dragState = {
    isDragging: false,
    startPositions: new Map(),
    dragStartPoint: null
};

/**
 * Handles the start of a drag operation on a node.
 * @param {object} event - The drag event.
 * @param {object} d - The node data.
 * @param {object} simulation - The D3 simulation instance.
 * @param {string} currentLayout - The current layout type.
 * @param {object} selectionManager - The selection manager instance.
 * @param {Array<object>} nodes - The array of all nodes.
 */
export function dragStarted(event, d, simulation, currentLayout, selectionManager, nodes) {
    // Handle selection if selectionManager is available
    if (selectionManager) {
        // If dragging a non-selected node, select only this one (unless Ctrl/Cmd is held)
        if (!selectionManager.isSelected(d.id) && !(event.sourceEvent?.ctrlKey || event.sourceEvent?.metaKey)) {
            selectionManager.selectSingle(d.id);
            // Visual update is handled by the selection manager's onChange handler
        }

        // Store initial positions for all selected nodes
        dragState.startPositions.clear();
        const getNode = (id) => (simulation ? simulation.nodes().find(n => n.id === id) : nodes.find(n => n.id === id));
        selectionManager.selectedNodes.forEach(nodeId => {
            const node = getNode(nodeId);
            if (node) {
                dragState.startPositions.set(nodeId, { x: node.x, y: node.y });
            }
        });

        // For force layouts, pin all selected nodes
        if (currentLayout === 'force' || currentLayout === 'force-directed') {
            if (simulation) simulation.alphaTarget(0.3).restart();
            selectionManager.selectedNodes.forEach(nodeId => {
                const node = getNode(nodeId);
                if (node) {
                    node.fx = node.x;
                    node.fy = node.y;
                }
            });
        }
    }

    dragState.isDragging = true;
    dragState.dragStartPoint = { x: event.x, y: event.y };

    if (!selectionManager && (currentLayout === 'force' || currentLayout === 'force-directed')) {
        if (simulation) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
}

/**
 * Handles the drag event, moving the selected node(s).
 * @param {object} event - The drag event.
 * @param {object} d - The node data being dragged.
 * @param {object} simulation - The D3 simulation instance.
 * @param {string} currentLayout - The current layout type.
 * @param {number} gridSize - The grid size for snapping.
 * @param {object} selectionManager - The selection manager instance.
 * @param {Array<object>} nodes - The array of all nodes.
 */
export function dragged(event, d, simulation, currentLayout, gridSize, selectionManager, nodes) {
    if (!dragState.isDragging) return;

    const dx = event.x - dragState.dragStartPoint.x;
    const dy = event.y - dragState.dragStartPoint.y;

    const getNode = (id) => (simulation ? simulation.nodes().find(n => n.id === id) : nodes.find(n => n.id === id));

    if (selectionManager && selectionManager.selectedNodes.has(d.id)) {
        selectionManager.selectedNodes.forEach(nodeId => {
            const node = getNode(nodeId);
            const startPos = dragState.startPositions.get(nodeId);
            if (node && startPos) {
                let newX = startPos.x + dx;
                let newY = startPos.y + dy;

                if (currentLayout === 'manual-grid') {
                    const snapped = snapToGrid(newX, newY, gridSize);
                    newX = snapped.x;
                    newY = snapped.y;
                }
                node.x = newX;
                node.y = newY;
                node.fx = newX;
                node.fy = newY;
            }
        });
    } else {
        let newX = event.x;
        let newY = event.y;
        if (currentLayout === 'manual-grid') {
            const snapped = snapToGrid(newX, newY, gridSize);
            newX = snapped.x;
            newY = snapped.y;
        }
        d.x = newX;
        d.y = newY;
        d.fx = newX;
        d.fy = newY;
    }
}

/**
 * Handles the end of a drag operation.
 * @param {object} event - The drag event.
 * @param {object} d - The node data.
 * @param {object} simulation - The D3 simulation instance.
 * @param {string} currentLayout - The current layout type.
 * @param {object} selectionManager - The selection manager instance.
 * @param {Array<object>} nodes - The array of all nodes.
 */
export function dragEnded(event, d, simulation, currentLayout, selectionManager, nodes) {
    dragState.isDragging = false;
    dragState.startPositions.clear();
    dragState.dragStartPoint = null;

    const unpinNode = (node) => {
        if (node) {
            node.fx = null;
            node.fy = null;
        }
    };

    if (currentLayout === 'force' || currentLayout === 'force-directed') {
        if (simulation) simulation.alphaTarget(0);

        if (selectionManager && selectionManager.selectedNodes.has(d.id)) {
            const getNode = (id) => (simulation ? simulation.nodes().find(n => n.id === id) : nodes.find(n => n.id === id));
            selectionManager.selectedNodes.forEach(nodeId => {
                unpinNode(getNode(nodeId));
            });
        } else {
            unpinNode(d);
        }
    }
    // For manual-grid and hierarchical layouts, nodes remain fixed (fx/fy are not cleared).

    if (simulation) {
        simulation.alpha(0.3).restart();
    }
}