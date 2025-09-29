import * as/**
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
        }ort { snapToGrid } from './utils.js';
import { highlightNode as renderHighlight, clearHighlight as renderClearHighlight, updateSelectionVisuals, createSelectionRect } from './render.js';
import { highlightTableRowByNodeId } from './ui.js';

// Store drag state for multi-node operations
import { updateSelectionVisuals } from './render.js';

// Drag state management
const dragState = {

/**
 * Handles the start of a drag event on a node (with multi-select support).
 * @param {object} event - The D3 drag event.
 * @param {object} d - The node data.
 * @param {object} simulation - The D3 simulation instance.
 * @param {string} currentLayout - The current layout type.
 * @param {object} selectionManager - The selection manager instance.
 * @param {Array<object>} allNodes - All nodes for reference.
 */
export function dragStarted(event, d, simulation, currentLayout, selectionManager = null, allNodes = []) {
    console.log(`🔥 Drag started for node: ${d.id}, layout: ${currentLayout}`);
    
    // Handle selection if selectionManager is available
    if (selectionManager) {
        // If dragging a non-selected node, select only this one (unless Ctrl/Cmd is held)
        if (!selectionManager.isSelected(d.id) && !(event.sourceEvent?.ctrlKey || event.sourceEvent?.metaKey)) {
            selectionManager.selectSingle(d.id);
        }
        
        // Store initial positions for all selected nodes
        dragState.startPositions.clear();
        dragState.isDragging = true;
        dragState.dragStartPoint = { x: event.x, y: event.y };
        
        selectionManager.getSelectedIds().forEach(nodeId => {
            const node = allNodes.find(n => n.id === nodeId);
            if (node) {
                dragState.startPositions.set(nodeId, { x: node.x, y: node.y });
            }
        });
    }
    
    if (currentLayout !== 'manual-grid') {
        // Safely kick the simulation only if it exists
        if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
    }
    
    d.fx = d.x;
    d.fy = d.y;
}

/**
 * Handles the dragging of a node (with multi-select support).
 * @param {object} event - The D3 drag event.
 * @param {object} d - The node data.
 * @param {string} currentLayout - The current layout type.
 * @param {number} gridSize - The grid size for snapping.
 * @param {object} selectionManager - The selection manager instance.
 * @param {Array<object>} allNodes - All nodes for reference.
 */
export function dragged(event, d, currentLayout, gridSize, selectionManager = null, allNodes = []) {
    if (selectionManager && dragState.isDragging && dragState.startPositions.size > 0) {
        // Multi-node drag
        const deltaX = event.x - dragState.dragStartPoint.x;
        const deltaY = event.y - dragState.dragStartPoint.y;
        
        selectionManager.getSelectedIds().forEach(nodeId => {
            const node = allNodes.find(n => n.id === nodeId);
            const startPos = dragState.startPositions.get(nodeId);
            
            if (node && startPos) {
                const newX = startPos.x + deltaX;
                const newY = startPos.y + deltaY;
                
                if (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') {
                    const snapped = snapToGrid(newX, newY, gridSize);
                    node.x = snapped.x;
                    node.y = snapped.y;
                    node.fx = node.x;
                    node.fy = node.y;
                } else {
                    node.fx = newX;
                    node.fy = newY;
                }
            }
        });
    } else {
        // Single node drag (fallback)
        if (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') {
            const snapped = snapToGrid(event.x, event.y, gridSize);
            d.x = snapped.x;
            d.y = snapped.y;
            d.fx = d.x;
            d.fy = d.y;
        } else {
            d.fx = event.x;
            d.fy = event.y;
        }
    }
}

/**
 * Handles the end of a drag event on a node (with multi-select support).
 * @param {object} event - The D3 drag event.
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
                
                import('./render.js').then(({ updateSelectionVisuals }) => {
                    updateSelectionVisuals(g, selectionManager.selectedNodes);
                });
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
            import('./render.js').then(({ updateSelectionVisuals }) => {
                updateSelectionVisuals(g, selectionManager.selectedNodes);
            });
        }
        
        // Clear selection (Escape)
        if (event.key === 'Escape') {
            selectionManager.clearSelection();
            import('./render.js').then(({ updateSelectionVisuals }) => {
                updateSelectionVisuals(g, selectionManager.selectedNodes);
            });
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
 * Handle node click with multi-select support.
 * @param {Event} event - The click event
 * @param {object} d - The node data
 * @param {object} selectionManager - The selection manager instance
 * @param {d3.Selection} g - The main D3 group element for visual updates
 * @param {Array<object>} allNodes - All nodes for range selection
 */
export function handleNodeClickSelection(event, d, selectionManager = null, g = null, allNodes = []) {
    if (!selectionManager) {
        // Fallback to original behavior
        try {
            highlightTableRowByNodeId(d.id);
        } catch(e) {
            // no-op if table not present
        }
        return;
    }

    if (event.ctrlKey || event.metaKey) {
        // Multi-select mode: toggle selection
        selectionManager.toggleSelection(d.id);
    } else if (event.shiftKey && selectionManager.lastSelectedId) {
        // Range select mode
        selectionManager.selectRange(allNodes, selectionManager.lastSelectedId, d.id);
    } else {
        // Single select mode
        selectionManager.selectSingle(d.id);
    }
    
    // Update visual feedback
    if (g) {
        updateSelectionVisuals(g, selectionManager.selectedNodes);
    }
    
    // Sync with table
    try {
        highlightTableRowByNodeId(d.id);
    } catch(e) {
        // no-op if table not present
    }
}

/**
 * Applies search and filter criteria to the node set.
 * @param {string} searchQuery - The search query string.
 * @param {string} typeFilter - The selected type filter.
 * @param {string} executionFilter - The selected execution filter.
 * @param {Array<Object>} allNodes - The complete list of nodes.
 * @param {Array<Object>} allLinks - The complete list of links.
 * @returns {{filteredNodes: Array<Object>, filteredLinks: Array<Object>}}
 */
export function applyFilters(searchQuery, typeFilter, executionFilter, allNodes, allLinks) {
    let filteredNodes = [...allNodes];

    if (searchQuery) {
        filteredNodes = filteredNodes.filter(node =>
            node.Name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (typeFilter) {
        filteredNodes = filteredNodes.filter(node => node.Type === typeFilter);
    }

    if (executionFilter) {
        filteredNodes = filteredNodes.filter(node => node.Execution === executionFilter);
    }

    const filteredIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = allLinks.filter(link =>
        filteredIds.has(link.source.id || link.source) &&
        filteredIds.has(link.target.id || link.target)
    );

    return { filteredNodes, filteredLinks };
}

/**
 * Handles highlighting a node and its connections.
 * @param {d3.Selection} g - The main D3 group for rendering.
 * @param {object} selectedNode - The node to highlight.
 * @param {Array<Object>} links - The array of all links.
 */
export function highlightNode(g, selectedNode, links) {
    renderHighlight(g, selectedNode, links);
}

/**
 * Clears all node and link highlighting.
 * @param {d3.Selection} g - The main D3 group for rendering.
 */
export function clearHighlight(g) {
    renderClearHighlight(g);
}

/**
 * Handles the zoom event from D3.
 * @param {object} event - The D3 zoom event.
 * @param {d3.Selection} zoomGroup - The D3 group to apply the transform to.
 */
export function handleZoom(event, zoomGroup) {
    zoomGroup.attr('transform', event.transform);
}

/**
 * Handles window resize events.
 * @param {object} state - The application state.
 * @param {d3.Selection} svg - The main SVG element.
 */
export function handleResize(state, svg) {
    const container = document.getElementById('networkGraph');
    state.width = container.clientWidth;
    state.height = container.clientHeight;

    svg.attr('width', state.width).attr('height', state.height);

    if (state.simulation) {
        state.simulation.force('center', d3.forceCenter(state.width / 2, state.height / 2));
        state.simulation.alpha(0.3).restart();
    }
}