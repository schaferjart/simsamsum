import * as d3 from 'd3';
import { snapToGrid } from './utils.js';
import { highlightNode as renderHighlight, clearHighlight as renderClearHighlight, updateSelectionVisuals } from './render.js';
import { highlightTableRowByNodeId, updateTableSelectionHighlights, clearTableRowHoverHighlight } from './ui/index.js';

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
export function dragStarted(event, d, simulation, currentLayout, selectionManager = null, nodes = []) {
    console.log(`🔥 Drag started for node: ${d.id}, layout: ${currentLayout}`);
    
    // Handle selection if selectionManager is available
    if (selectionManager) {
        // If dragging a non-selected node, select only this one (unless Ctrl/Cmd is held)
        if (!selectionManager.isSelected(d.id) && !(event.sourceEvent?.ctrlKey || event.sourceEvent?.metaKey)) {
            selectionManager.selectSingle(d.id);
            updateSelectionVisuals(d3.select('svg g'), selectionManager.selectedNodes);
            // Sync table highlights for multi-select
            updateTableSelectionHighlights(selectionManager.selectedNodes);
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

        // For force layouts, pin all selected nodes at their current positions before dragging
        if (currentLayout === 'force' || currentLayout === 'force-directed') {
            if (simulation) simulation.alphaTarget(0.3).restart();
            selectionManager.selectedNodes.forEach(nodeId => {
                const node = (simulation ? simulation.nodes().find(n => n.id === nodeId) : nodes.find(n => n.id === nodeId));
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
export function dragged(event, d, simulation, currentLayout, gridSize, selectionManager = null, nodes = []) {
    if (!dragState.isDragging) return;
    
    // Calculate movement delta
    const dx = event.x - dragState.dragStartPoint.x;
    const dy = event.y - dragState.dragStartPoint.y;
    
    if (selectionManager && selectionManager.selectedNodes.has(d.id)) {
        // Move all selected nodes
        const getNode = (id) => (simulation ? simulation.nodes().find(n => n.id === id) : nodes.find(n => n.id === id));
        {
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
            const snapped = snapToGrid(event.x, event.y, gridSize);
            d.x = snapped.x;
            d.y = snapped.y;
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
export function dragEnded(event, d, simulation, currentLayout, selectionManager = null, nodes = []) {
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
                const node = (simulation ? simulation.nodes().find(n => n.id === nodeId) : nodes.find(n => n.id === nodeId));
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
                const node = (simulation ? simulation.nodes().find(n => n.id === nodeId) : nodes.find(n => n.id === nodeId));
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
    // Sync table highlights for multi-select and connections
    updateTableSelectionHighlights(selectionManager.selectedNodes);
}

/**
 * Initializes rectangle selection on empty space
 * @param {d3.Selection} svg - The SVG element
 * @param {d3.Selection} g - The main group element
 * @param {object} selectionManager - The selection manager instance
 * @param {Array<object>} allNodes - All nodes for selection
 * @param {d3.zoom} zoomBehavior - The zoom behavior for coordinate transformation
 */
// Shift-only rectangle selection (reintroduced): draw a selection rect when Shift is held on empty space
export function initShiftRectangleSelection(svg, g, selectionManager, getNodes) {
    let startPoint = null;
    let selectionRect = null;
    let isSelecting = false;
    // Suppress the next background click after finishing a rectangle drag,
    // so the onBackgroundClick handler in render.js doesn't clear the fresh selection.
    let suppressNextClick = false;

    // Clean previous handlers to avoid duplicates
    if (svg) {
        svg.on('mousedown.selection', null);
        svg.on('mousemove.selection', null);
        svg.on('mouseup.selection', null);
    }

    // Capture-phase click suppressor runs before render.js background click handler
    svg.on('click.selectionSuppress', function(event) {
        if (suppressNextClick) {
            event.stopPropagation();
            suppressNextClick = false;
        }
    }, true);

    svg.on('mousedown.selection', function(event) {
        // Begin only when Shift is held and not clicking on a node
        const isOnBackground = (event.target === svg.node()) || !event.target.closest || !event.target.closest('.node');
        if (!event.shiftKey || !isOnBackground) return;

        event.preventDefault();
        event.stopPropagation();
        isSelecting = true;

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
    });

    svg.on('mousemove.selection', function(event) {
        if (!isSelecting || !startPoint || !selectionRect) return;
        event.preventDefault();
        event.stopPropagation();

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
    });

    svg.on('mouseup.selection', function(event) {
        if (!isSelecting || !selectionRect) return;
        event.preventDefault();
        event.stopPropagation();

        const transform = d3.zoomTransform(svg.node());
        const [x, y] = transform.invert(d3.pointer(event, svg.node()));

        const rectX = Math.min(startPoint[0], x);
        const rectY = Math.min(startPoint[1], y);
        const rectWidth = Math.abs(x - startPoint[0]);
        const rectHeight = Math.abs(y - startPoint[1]);

    // Always suppress the immediate background click after finishing selection mode
    suppressNextClick = true;

    if (rectWidth > 5 && rectHeight > 5) {
            const nodes = typeof getNodes === 'function' ? (getNodes() || []) : [];
            // Shift-drag adds to selection
            selectionManager.selectInRect(nodes, rectX, rectY, rectX + rectWidth, rectY + rectHeight, true);
            updateSelectionVisuals(g, selectionManager.selectedNodes);
            updateTableSelectionHighlights(selectionManager.selectedNodes);
        }

        selectionRect.remove();
        selectionRect = null;
        startPoint = null;
        isSelecting = false;
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
            updateTableSelectionHighlights(selectionManager.selectedNodes);
        }
        
        // Clear selection (Escape)
        if (event.key === 'Escape') {
            selectionManager.clearSelection();
            updateSelectionVisuals(g, selectionManager.selectedNodes);
            updateTableSelectionHighlights(selectionManager.selectedNodes);
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
    // Clear transient table hover when graph hover ends
    clearTableRowHoverHighlight();
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
