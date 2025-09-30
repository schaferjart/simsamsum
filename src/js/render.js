import * as d3 from 'd3';

let svg, zoomGroup, g, zoom;

/**
 * Initializes the main SVG container and zoom capabilities.
 * @param {HTMLElement} container - The container element for the graph.
 * @param {function} onZoom - Callback function for zoom events.
 * @param {function} onBackgroundClick - Callback for clicks on the SVG background.
 * @returns {object} { svg, zoomGroup, g, zoom }
 */
export function initVisualization(container, onZoom, onBackgroundClick) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(container).select('svg').remove();

    svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    svg.append('defs').selectAll('marker')
        .data(['arrowhead'])
        .enter().append('marker')
        .attr('id', d => d)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#626c7c');

    zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .filter((event) => {
            // Disable zoom/pan when Shift is held for rectangle selection
            return !event.shiftKey;
        })
        .on('zoom', onZoom);

    svg.call(zoom);

    svg.on('click', (event) => {
        if (event.target === event.currentTarget) {
            onBackgroundClick();
        }
    });

    zoomGroup = svg.append('g');
    g = zoomGroup.append('g');

    addZoomControls(svg, zoom);

    return { svg, zoomGroup, g, zoom, width, height };
}

/**
 * Adds zoom controls to the visualization.
 * @param {d3.Selection} svg - The main SVG selection.
 * @param {d3.ZoomBehavior} zoom - The D3 zoom behavior.
 */
/**
 * Adds zoom controls to the visualization.
 * @param {d3.Selection} svg - The main SVG selection.
 * @param {d3.ZoomBehavior} zoom - The D3 zoom behavior.
 * @private
 */
function addZoomControls(svg, zoom) {
    const container = svg.node().parentNode;
    d3.select(container).select('.zoom-controls').remove();

    const controls = d3.select(container)
        .append('div')
        .attr('class', 'zoom-controls');

    controls.append('button')
        .attr('class', 'zoom-btn')
        .text('+')
        .on('click', () => {
            svg.transition().duration(300).call(zoom.scaleBy, 1.5);
        });

    controls.append('button')
        .attr('class', 'zoom-btn')
        .text('−')
        .on('click', () => {
            svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.5);
        });

    controls.append('button')
        .attr('class', 'zoom-btn')
        .text('⌂')
        .on('click', () => {
            svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        });
}


/**
 * Renders the visual elements of the graph (nodes and links).
 * @param {d3.Selection} g - The main D3 group element for rendering.
 * @param {Array<Object>} nodes - The array of node data.
 * @param {Array<Object>} links - The array of link data.
 * @param {string} currentLayout - The current layout type.
 * @param {object} eventHandlers - Object containing event handlers (drag, click, hover).
 */
export function renderVisualizationElements(g, nodes, links, currentLayout, eventHandlers) {
    g.selectAll('*').remove();

    // Links
    const linkGroup = g.append('g').attr('class', 'links');
    if (currentLayout === 'hierarchical-orthogonal') {
        linkGroup.selectAll('path')
            .data(links)
            .enter().append('path')
            .attr('class', 'link orthogonal-link')
            .attr('fill', 'none')
            .attr('stroke', '#999')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');
    } else {
        linkGroup.selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');
    }

    // Nodes
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
    .enter().append('g')
    .attr('class', d => (currentLayout === 'manual-grid' || currentLayout === 'hierarchical-orthogonal') ? 'node draggable' : 'node')
        .call(d3.drag()
            .on('start', eventHandlers.dragStarted)
            .on('drag', eventHandlers.dragged)
            .on('end', eventHandlers.dragEnded));

    node.on('click', eventHandlers.nodeClicked);
    node.on('mouseover', eventHandlers.nodeMouseOver)
        .on('mouseout', eventHandlers.nodeMouseOut);

    // Node shapes
    node.each(function (d) {
        const nodeGroup = d3.select(this);
        const size = Math.max(10, d.size || 30);
        const borderStyle = d.borderStyle;

        let shape;
        switch (d.Type) {
            case 'Resource':
                shape = nodeGroup.append('rect')
                    .attr('width', size * 1.2)
                    .attr('height', size * 0.8)
                    .attr('x', -size * 0.6)
                    .attr('y', -size * 0.4);
                break;
            case 'Action':
                const triangleSize = size * 0.8;
                shape = nodeGroup.append('path')
                    .attr('d', `M0,${-triangleSize} L${triangleSize * 0.866},${triangleSize * 0.5} L${-triangleSize * 0.866},${triangleSize * 0.5} Z`);
                break;
            case 'State':
                shape = nodeGroup.append('circle')
                    .attr('r', Math.max(5, size * 0.6));
                break;
            case 'Decision':
                const diamondSize = size * 0.7;
                shape = nodeGroup.append('path')
                    .attr('d', `M0,${-diamondSize} L${diamondSize},0 L0,${diamondSize} L${-diamondSize},0 Z`);
                break;
            default:
                shape = nodeGroup.append('circle')
                    .attr('r', Math.max(5, size * 0.6));
        }

        shape.attr('fill', 'rgba(255, 255, 255, 0.8)')
            .attr('stroke', '#000000')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', borderStyle);
    });

    // Node labels
    node.append('text')
        .attr('class', 'node-label')
        .attr('dy', d => d.size + 20)
        .attr('text-anchor', 'middle')
        .text(d => d.Name.length > 15 ? d.Name.substring(0, 15) + '...' : d.Name);

    node.append('text')
        .attr('class', 'supplementary-info')
        .attr('dy', d => d.size + 35)
        .attr('text-anchor', 'middle')
        .text(d => {
            const cost = d["Effective Cost"] || d["Ø Cost"];
            return cost ? `€${cost}` : '';
        });
}

/**
 * Updates the positions of nodes and links.
 * @param {d3.Selection} g - The main D3 group element.
 */
export function updatePositions(g) {
    if (!g) return;
    g.selectAll('.node').attr('transform', d => `translate(${d.x},${d.y})`);

    g.selectAll('line.link')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    g.selectAll('path.link').attr('d', createOrthogonalPath);
}

/**
 * Creates an orthogonal path for a link.
 * @param {object} d - The link data.
 * @returns {string} The SVG path string.
 */
/**
 * Creates an SVG path string for an orthogonal link between two nodes.
 * This function is used specifically for the 'hierarchical-orthogonal' layout to draw
 * links with 90-degree bends, creating a cleaner, more structured look.
 * @param {object} d - The link data object, which must contain `source` and `target` node objects.
 * @returns {string} The SVG path data string (e.g., "M x1,y1 L x2,y2 ...").
 * @private
 */
function createOrthogonalPath(d) {
    const { source, target } = d;
    const sourceSize = source.size || 30;
    const targetSize = target.size || 30;

    const sourceY = source.y + sourceSize / 2 + 5;
    const targetY = target.y - targetSize / 2 - 5;
    const sourceX = source.x;
    const targetX = target.x;

    const horizontalDistance = Math.abs(targetX - sourceX);
    const verticalDistance = Math.abs(targetY - sourceY);

    if (horizontalDistance < 20) {
        return `M${sourceX},${sourceY} L${targetX},${targetY}`;
    }

    if (verticalDistance > 100) {
        const bendY = sourceY + (targetY - sourceY) * 0.55;
        return `M${sourceX},${sourceY} L${sourceX},${bendY} L${targetX},${bendY} L${targetX},${targetY}`;
    } else {
        const routingOffset = Math.max(40, verticalDistance * 0.7);
        const bendY = sourceY + routingOffset;
        return `M${sourceX},${sourceY} L${sourceX},${bendY} L${targetX},${bendY} L${targetX},${targetY}`;
    }
}

/**
 * Highlights a node and its connections.
 * @param {d3.Selection} g - The main D3 group element.
 * @param {object} selectedNode - The node to highlight.
 * @param {Array<Object>} links - All links in the graph.
 */
export function highlightNode(g, selectedNode, links) {
    if (!g) return;
    const connectedNodes = new Set([selectedNode.id]);
    links.forEach(link => {
        if (link.source.id === selectedNode.id || link.source === selectedNode.id) {
            connectedNodes.add(link.target.id || link.target);
        }
        if (link.target.id === selectedNode.id || link.target === selectedNode.id) {
            connectedNodes.add(link.source.id || link.source);
        }
    });

    g.selectAll('.node')
        .classed('highlighted', d => d.id === selectedNode.id)
        .classed('dimmed', d => !connectedNodes.has(d.id));

    g.selectAll('.link')
        .classed('highlighted', d => (d.source.id || d.source) === selectedNode.id || (d.target.id || d.target) === selectedNode.id)
        .classed('dimmed', d => !((d.source.id || d.source) === selectedNode.id || (d.target.id || d.target) === selectedNode.id));

    g.selectAll('.node-label, .supplementary-info')
        .classed('dimmed', d => !connectedNodes.has(d.id));
}

/**
 * Clears all highlighting from the graph.
 * @param {d3.Selection} g - The main D3 group element.
 */
export function clearHighlight(g) {
    if (!g) return;
    g.selectAll('.node, .link, .node-label, .supplementary-info')
        .classed('highlighted', false)
        .classed('dimmed', false);
}

/**
 * Updates the rotation of text elements to keep them readable.
 * @param {d3.Selection} g - The main D3 group element.
 * @param {number} graphRotation - The current rotation of the graph.
 * @param {object} graphTransform - The current transform of the graph.
 */
export function updateTextRotation(g, graphRotation, graphTransform) {
    if (!g) return;
    const counterRotation = -graphRotation;
    const textScaleX = graphTransform.scaleX < 0 ? -1 : 1;
    const textScaleY = graphTransform.scaleY < 0 ? -1 : 1;

    g.selectAll('.node-label, .supplementary-info')
        .transition()
        .duration(300)
        .attr('transform', `rotate(${counterRotation}) scale(${textScaleX}, ${textScaleY})`);
}

/**
 * Updates the display of the grid overlay.
 * @param {d3.Selection} svg - The main SVG selection.
 * @param {boolean} showGrid - Whether to show the grid.
 * @param {number} width - The width of the SVG.
 * @param {number} height - The height of the SVG.
 * @param {number} gridSize - The size of the grid cells.
 */
export function updateGridDisplay(svg, showGrid, width, height, gridSize) {
    if (!svg) return;
    svg.selectAll('.grid-line').remove();
    if (!showGrid) return;

    const gridGroup = svg.insert('g', ':first-child').attr('class', 'grid-overlay');

    for (let x = 0; x <= width; x += gridSize) {
        gridGroup.append('line')
            .attr('class', 'grid-line')
            .attr('x1', x).attr('y1', 0)
            .attr('x2', x).attr('y2', height)
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', x % (gridSize * 4) === 0 ? 1 : 0.5)
            .attr('opacity', 0.5);
    }

    for (let y = 0; y <= height; y += gridSize) {
        gridGroup.append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0).attr('y1', y)
            .attr('x2', width).attr('y2', y)
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', y % (gridSize * 4) === 0 ? 1 : 0.5)
            .attr('opacity', 0.5);
    }
}

/**
 * Updates the visual selection state for nodes
 * @param {d3.Selection} g - The main D3 group element
 * @param {Set<string>} selectedNodeIds - Set of selected node IDs
 */
export function updateSelectionVisuals(g, selectedNodeIds) {
    if (!g) return;

    // Selected nodes
    g.selectAll('.node')
        .classed('selected', d => selectedNodeIds.has(d.id))
        .select('rect, circle, path')
        .attr('stroke', d => selectedNodeIds.has(d.id) ? '#007bff' : '#000000')
        .attr('stroke-width', d => selectedNodeIds.has(d.id) ? 3 : 2);

    // Links connected to any selected node
    const anySelected = selectedNodeIds && selectedNodeIds.size > 0;
    g.selectAll('.link')
        .classed('selected', d => anySelected && (selectedNodeIds.has(d.source?.id ?? d.source) || selectedNodeIds.has(d.target?.id ?? d.target)))
        .classed('dimmed', d => anySelected && !(selectedNodeIds.has(d.source?.id ?? d.source) || selectedNodeIds.has(d.target?.id ?? d.target)));

    // Labels dim when any selection exists and the node isn't selected
    g.selectAll('.node-label, .supplementary-info')
        .classed('dimmed', d => anySelected && !selectedNodeIds.has(d.id));
}

/**
 * Creates a selection rectangle for drag selection
 * @param {d3.Selection} g - The main D3 group element
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @returns {d3.Selection} The selection rectangle element
 */
export function createSelectionRect(g, x, y, width, height) {
    return g.append('rect')
        .attr('class', 'selection-rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'rgba(0, 123, 255, 0.1)')
        .attr('stroke', '#007bff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5');
}

/**
 * Highlights a single node element by its id without dimming others.
 * Useful for syncing selection from the table to the graph.
 * @param {string} nodeId
 */
export function highlightNodeById(nodeId) {
    if (!g) return;
    g.selectAll('.node')
        .classed('table-highlight', d => d.id === nodeId);
}