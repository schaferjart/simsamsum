import * as d3 from 'd3';
import { snapToGrid } from './utils.js';
import { highlightNode as renderHighlight, clearHighlight as renderClearHighlight, updateSelectionVisuals } from './render.js';
import { highlightTableRowByNodeId } from './ui.js';

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
 */
export function dragStarted(event, d, simulation, currentLayout, selectionManager = null) {
    console.log(`🔥 Drag started for node: ${d.id}, layout: ${currentLayout}`);
    
    // Handle selection if selectionManager is available
    if (selectionManager) {
        // If dragging a non-selected node, select only this one (unless Ctrl/Cmd is held)
        if (!selectionManager.isSelected(d.id) && !(event.sourceEvent?.ctrlKey || event.sourceEvent?.metaKey)) {
            selectionManager.selectSingle(d.id);
            updateSelectionVisuals(d3.select('svg g'), selectionManager.selectedNodes);
        }
        
        // Store initial positions for all selected nodes
        dragState.startPositions.clear();
        selectionManager.selectedNodes.forEach(nodeId => {
            const node = simulation.nodes().find(n => n.id === nodeId);
            if (node) {
                dragState.startPositions.set(nodeId, { x: node.x, y: node.y });
            }
        });

        // For force layouts, pin all selected nodes at their current positions before dragging
        if (currentLayout === 'force' || currentLayout === 'force-directed') {
            if (simulation) simulation.alphaTarget(0.3).restart();
            selectionManager.selectedNodes.forEach(nodeId => {
                const node = simulation.nodes().find(n => n.id === nodeId);
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
 * Handles the drag event on a node.
 * @param {object} event - The drag event.
 * @param {object} d - The node data.
 * @param {string} currentLayout - The current layout type.
 * @param {number} gridSize - The grid size for snapping.
 * @param {object} selectionManager - The selection manager instance.
 */
export function dragged(event, d, simulation, currentLayout, gridSize, selectionManager = null) {
    if (!dragState.isDragging) return;
    
    // Calculate movement delta
    const dx = event.x - dragState.dragStartPoint.x;
    const dy = event.y - dragState.dragStartPoint.y;
    
    if (selectionManager && selectionManager.selectedNodes.has(d.id)) {
        // Move all selected nodes
        if (simulation) {
            selectionManager.selectedNodes.forEach(nodeId => {
                const node = simulation.nodes().find(n => n.id === nodeId);
                const startPos = dragState.startPositions.get(nodeId);
                if (node && startPos) {
                    let newX = startPos.x + dx;
                    let newY = startPos.y + dy;
                    
                    if (currentLayout === 'manual-grid') {
                        newX = snapToGrid(newX, gridSize);
                        newY = snapToGrid(newY, gridSize);
                    }
                    
                    node.x = newX;
                    node.y = newY;
                    
                    if (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') {
                        node.fx = newX;
                        node.fy = newY;
                    } else if (currentLayout === 'force' || currentLayout === 'force-directed') {
                        // Keep selected nodes pinned to follow pointer delta during force drag
                        node.fx = newX;
                        node.fy = newY;
                    }
                }
            });
        }
    } else {
        // Single node movement
        if (currentLayout === 'manual-grid') {
            d.x = snapToGrid(event.x, gridSize);
            d.y = snapToGrid(event.y, gridSize);
        } else {
            d.x = event.x;
            d.y = event.y;
        }
        
        if (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') {
            d.fx = d.x;
            d.fy = d.y;
        } else if (currentLayout === 'force' || currentLayout === 'force-directed') {
            d.fx = d.x;
            d.fy = d.y;
        }
    }
}

/**
 * Handles the end of a drag operation on a node.
 * @param {object} event - The drag event.
 * @param {object} d - The node data.
 * @param {object} simulation - The D3 simulation instance.
 * @param {string} currentLayout - The current layout type.
 * @param {object} selectionManager - The selection manager instance.
 */
export function dragEnded(event, d, simulation, currentLayout, selectionManager = null) {
    dragState.isDragging = false;
    dragState.startPositions.clear();
    dragState.dragStartPoint = null;
    
    if (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') {
        // Keep position fixed in manual mode
        d.fx = d.x;
        d.fy = d.y;
        
        // Fix positions for all selected nodes
        if (selectionManager && selectionManager.selectedNodes.has(d.id)) {
            selectionManager.selectedNodes.forEach(nodeId => {
                const node = simulation.nodes().find(n => n.id === nodeId);
                if (node) {
                    node.fx = node.x;
                    node.fy = node.y;
                }
            });
        }
    } else if (currentLayout === 'force' || currentLayout === 'force-directed') {
        // Release fixed positions so force can continue
        if (selectionManager && selectionManager.selectedNodes.has(d.id)) {
            selectionManager.selectedNodes.forEach(nodeId => {
                const node = simulation.nodes().find(n => n.id === nodeId);
                if (node) {
                    node.fx = null;
                    node.fy = null;
                }
            });
        } else {
            d.fx = null;
            d.fy = null;
        }
        if (simulation) simulation.alphaTarget(0);
    }
    
    if (simulation) {
        simulation.alpha(0.3).restart();
    }
}

/**
 * Handles node click events for selection
 * @param {object} event - The click event
 * @param {object} d - The node data
 * @param {object} selectionManager - The selection manager instance
 * @param {d3.Selection} g - The main group element for visual updates
 */
export function handleNodeClickSelection(event, d, selectionManager, g) {
    if (!selectionManager) return;
    
    event.stopPropagation();
    
    if (event.ctrlKey || event.metaKey) {
        // Toggle selection with Ctrl/Cmd
        selectionManager.toggleSelection(d.id);
    } else if (event.shiftKey && selectionManager.lastSelectedId) {
        // Range selection with Shift (would need node ordering logic)
        console.log('Shift+click range selection not yet implemented');
    } else {
        // Single selection
        selectionManager.selectSingle(d.id);
    }
    
    updateSelectionVisuals(g, selectionManager.selectedNodes);
}

/**
 * Initializes rectangle selection on empty space
 * @param {d3.Selection} svg - The SVG element
 * @param {d3.Selection} g - The main group element
 * @param {object} selectionManager - The selection manager instance
 * @param {Array<object>} allNodes - All nodes for selection
 * @param {d3.zoom} zoomBehavior - The zoom behavior for coordinate transformation
 */
// Rectangle selection disabled per request.

/**
 * Initializes keyboard shortcuts for selection
 * @param {object} selectionManager - The selection manager instance
 * @param {d3.Selection} g - The main group element for visual updates
 * @param {Array<object>} allNodes - All nodes
 */
export function initKeyboardShortcuts(selectionManager, g, allNodes) {
    document.addEventListener('keydown', (event) => {
        // Select all (Ctrl/Cmd + A)
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();
            selectionManager.selectAll(allNodes.map(n => n.id));
            updateSelectionVisuals(g, selectionManager.selectedNodes);
        }
        
        // Clear selection (Escape)
        if (event.key === 'Escape') {
            selectionManager.clearSelection();
            updateSelectionVisuals(g, selectionManager.selectedNodes);
        }
        
        // Delete selected nodes (Delete key)
        if (event.key === 'Delete' && selectionManager.getSelectionCount() > 0) {
            event.preventDefault();
            // This would need to be handled by the core application
            console.log('Delete key pressed for selected nodes:', selectionManager.getSelectedIds());
        }
    });
}

/**
 * Handles zoom events.
 * @param {object} event - The zoom event.
 * @param {d3.Selection} zoomGroup - The group element that zoom is applied to.
 */
export function handleZoom(event, zoomGroup) {
    if (!zoomGroup) return;
    
    const { transform } = event;
    zoomGroup.attr('transform', transform);
}

/**
 * Highlights a node based on hover.
 * @param {object} d - The node data.
 * @param {d3.Selection} g - The main group element.
 */
export function highlightNode(d, g) {
    renderHighlight(d, g);
    highlightTableRowByNodeId(d.id);
}

/**
 * Clears highlighting from all nodes.
 * @param {d3.Selection} g - The main group element.
 */
export function clearHighlight(g) {
    renderClearHighlight(g);
}

/**
 * Handles window resize events.
 * @param {object} state - The application state.
 * @param {d3.Selection} svg - The main SVG element.
 */
export function handleResize(state, svg) {
    const container = document.getElementById('networkGraph');
    if (!container || !svg) return;
    state.width = container.clientWidth;
    state.height = container.clientHeight;
    svg.attr('width', state.width).attr('height', state.height);
    if (state.simulation) {
        state.simulation.force('center', d3.forceCenter(state.width / 2, state.height / 2));
        state.simulation.alpha(0.15).restart();
    }
}
