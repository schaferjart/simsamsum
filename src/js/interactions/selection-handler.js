/**
 * @module interactions/selection-handler
 * This module manages node selection, including single-click and rectangle selection.
 */
import * as d3 from 'd3';
import { updateSelectionVisuals } from '../render/index.js';
import { updateTableSelectionHighlights } from '../ui/index.js';

/**
 * Handles node click events for selection.
 * @param {object} event - The click event.
 * @param {object} d - The node data.
 * @param {object} selectionManager - The selection manager instance.
 * @param {d3.Selection} g - The main group element for visual updates.
 */
export function handleNodeClickSelection(event, d, selectionManager, g) {
    if (!selectionManager) return;

    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
        selectionManager.toggleSelection(d.id);
    } else if (event.shiftKey && selectionManager.lastSelectedId) {
        console.log('Shift+click range selection not yet implemented');
    } else {
        selectionManager.selectSingle(d.id);
    }
    // Visual updates are now handled by the selectionManager's onChange handler
}

/**
 * Initializes rectangle selection functionality when the user shift-drags on the SVG background.
 * @param {d3.Selection} svg - The SVG element.
 * @param {d3.Selection} g - The main group element where nodes are rendered.
 * @param {object} selectionManager - The selection manager instance.
 * @param {function(): Array<object>} getNodes - A function that returns the current array of all nodes.
 */
export function initShiftRectangleSelection(svg, g, selectionManager, getNodes) {
    let startPoint = null;
    let selectionRect = null;
    let isSelecting = false;
    let suppressNextClick = false;

    // Clean previous handlers to avoid duplicates
    if (svg) {
        svg.on('mousedown.selection', null);
        svg.on('mousemove.selection', null);
        svg.on('mouseup.selection', null);
        svg.on('click.selectionSuppress', null);
    }

    svg.on('click.selectionSuppress', function(event) {
        if (suppressNextClick) {
            event.stopPropagation();
            suppressNextClick = false;
        }
    }, true);

    svg.on('mousedown.selection', function(event) {
        const isOnBackground = event.target === svg.node() || !event.target.closest('.node');
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
            .attr('stroke-width', 1 / transform.k) // Scale stroke width with zoom
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

        suppressNextClick = true;

        if (rectWidth > 5 && rectHeight > 5) {
            const nodes = getNodes() || [];
            selectionManager.selectInRect(nodes, rectX, rectY, rectX + rectWidth, rectY + rectHeight, true);
        }

        selectionRect.remove();
        selectionRect = null;
        startPoint = null;
        isSelecting = false;
    });
}