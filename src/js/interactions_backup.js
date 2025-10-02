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
    }
    
    dragState.isDragging = true;
    dragState.dragStartPoint = { x: event.x, y: event.y };
    
    if (currentLayout === 'force' || currentLayout === 'force-directed') {
        if (simulation) {
            simulation.alphaTarget(0.3).restart();
        }
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
export function dragged(event, d, currentLayout, gridSize, selectionManager = null) {
    if (!dragState.isDragging) return;
    
    // Calculate movement delta
    const dx = event.x - dragState.dragStartPoint.x;
    const dy = event.y - dragState.dragStartPoint.y;
    
    if (selectionManager && selectionManager.selectedNodes.has(d.id)) {
        // Move all selected nodes
        const simulation = d3.select('svg').datum()?.simulation;
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
export function initRectangleSelection(svg, g, selectionManager, allNodes, zoomBehavior) {
    let startPoint = null;
    let selectionRect = null;
    let isSelecting = false;

    svg.on('mousedown.selection', function(event) {
        // Only start selection on empty space (not on nodes)
        if (event.target === svg.node() || event.target.closest('.node') === null) {
            event.preventDefault();
            isSelecting = true;
            
            // Transform coordinates to account for zoom/pan
            const transform = d3.zoomTransform(svg.node());
            const [x, y] = transform.invert(d3.pointer(event, svg.node()));
            startPoint = [x, y];
            
            selectionRect = g.append('rect')
                .attr('class', 'selection-rect')
                .attr('x', x)
                .attr('y', y)
                .attr('width', 0)
                .attr('height', 0)
                .attr('fill', 'rgba(0, 123, 255, 0.1)')
                .attr('stroke', '#007bff')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '5,5');
        }
    });

    svg.on('mousemove.selection', function(event) {
        if (isSelecting && startPoint && selectionRect) {
            event.preventDefault();
            
            const transform = d3.zoomTransform(svg.node());
            const [x, y] = transform.invert(d3.pointer(event, svg.node()));
            
            const rectX = Math.min(startPoint[0], x);
            const rectY = Math.min(startPoint[1], y);
            const rectWidth = Math.abs(x - startPoint[0]);
            const rectHeight = Math.abs(y - startPoint[1]);
            
            selectionRect
                .attr('x', rectX)
                .attr('y', rectY)
                .attr('width', rectWidth)
                .attr('height', rectHeight);
        }
    });

    svg.on('mouseup.selection', function(event) {
        if (isSelecting && selectionRect) {
            event.preventDefault();
            
            const transform = d3.zoomTransform(svg.node());
            const [x, y] = transform.invert(d3.pointer(event, svg.node()));
            
            const rectX = Math.min(startPoint[0], x);
            const rectY = Math.min(startPoint[1], y);
            const rectWidth = Math.abs(x - startPoint[0]);
            const rectHeight = Math.abs(y - startPoint[1]);
            
            // Only select if we actually dragged (minimum size)
            if (rectWidth > 5 && rectHeight > 5) {
                const addToSelection = event.ctrlKey || event.metaKey;
                selectionManager.selectInRect(
                    allNodes, 
                    rectX, 
                    rectY, 
                    rectX + rectWidth, 
                    rectY + rectHeight, 
                    addToSelection
                );
                
                updateSelectionVisuals(g, selectionManager.selectedNodes);
            }
            
            selectionRect.remove();
            selectionRect = null;
            startPoint = null;
            isSelecting = false;
        }
    });
}

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
