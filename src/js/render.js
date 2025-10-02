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
        .attr('fill', getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#626c7c');

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
/**
 * Converts a hex color string to an RGBA string.
 * @param {string} hex - The hex color (e.g., "#RRGGBB").
 * @param {number} alpha - The alpha value (0-1).
 * @returns {string} The RGBA color string.
 */
function hexToRgba(hex, alpha) {
    if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return hex;
    let c = hex.substring(1).split('');
    if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
}

/**
 * Applies a set of styles to a D3 selection of links.
 * @param {d3.Selection} selection - The D3 selection of links.
 */
function applyLinkStyles(selection) {
    selection
        .style('stroke', d => (d.customStyle && d.customStyle.borderColor) || '#999')
        .style('stroke-width', d => (d.customStyle && d.customStyle.borderWeight) || 2)
        .style('stroke-dasharray', d => {
            const style = d.customStyle && d.customStyle.borderStyle;
            if (style === 'dashed') return '5,5';
            if (style === 'dotted') return '2,2';
            return null;
        })
        .attr('marker-end', 'url(#arrowhead)')
        .attr('fill', 'none');
}

export function renderVisualizationElements(g, nodes, links, currentLayout, eventHandlers) {
    g.selectAll('*').remove();

    // Links
    const linkGroup = g.append('g').attr('class', 'links');
    const defaultLinetype = currentLayout === 'hierarchical-orthogonal' ? 'elbowed' : 'straight';

    const straightLinks = links.filter(l => (l.customStyle?.connectionLineType || defaultLinetype) === 'straight');
    const curvedLinks = links.filter(l => (l.customStyle?.connectionLineType) === 'curved');
    const elbowedLinks = links.filter(l => (l.customStyle?.connectionLineType || defaultLinetype) === 'elbowed');

    applyLinkStyles(linkGroup.selectAll('line.link').data(straightLinks).enter().append('line').attr('class', 'link'));
    applyLinkStyles(linkGroup.selectAll('path.curved-link').data(curvedLinks).enter().append('path').attr('class', 'link curved-link'));
    applyLinkStyles(linkGroup.selectAll('path.elbowed-link').data(elbowedLinks).enter().append('path').attr('class', 'link elbowed-link'));

    // Nodes
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .attr('class', d => {
            let classes = 'node draggable';
            if (d.filterStyle) {
                if (d.filterStyle.highlighted) classes += ' highlighted';
                if (d.filterStyle.dimmed) classes += ' dimmed';
            }
            return classes;
        })
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
        const style = d.customStyle || {};
        const size = Math.max(10, d.size || 30);

        const shapeType = style.shape || d.Type;
        let shape;

        switch (shapeType) {
            case 'rect':
            case 'Resource':
                shape = nodeGroup.append('rect')
                    .attr('width', size * 1.2).attr('height', size * 0.8)
                    .attr('x', -size * 0.6).attr('y', -size * 0.4);
                break;
            case 'triangle':
            case 'Action':
                shape = nodeGroup.append('path')
                    .attr('d', `M0,${-size * 0.8} L${size * 0.7},${size * 0.4} L${-size * 0.7},${size * 0.4} Z`);
                break;
            case 'diamond':
            case 'Decision':
                shape = nodeGroup.append('path')
                    .attr('d', `M0,${-size * 0.7} L${size * 0.7},0 L0,${size * 0.7} L${-size * 0.7},0 Z`);
                break;
            case 'circle':
            case 'State':
            default:
                shape = nodeGroup.append('circle').attr('r', size * 0.6);
        }

        const fillColor = style.color ? hexToRgba(style.color, style.opacity ?? 1.0) : 'rgba(255, 255, 255, 0.8)';
        let strokeDashArray = '';
        if (style.borderStyle === 'dashed') strokeDashArray = '5,5';
        else if (style.borderStyle === 'dotted') strokeDashArray = '2,2';

        shape.attr('fill', fillColor)
            .attr('stroke', style.borderColor || '#000000')
            .attr('stroke-width', style.borderWeight ?? 2)
            .attr('stroke-dasharray', strokeDashArray);
    });

    // Node labels
    node.append('text')
        .attr('class', 'node-label')
        .text(d => d.Name)
        .each(function(d) {
            const style = d.customStyle || {};
            const size = Math.max(10, d.size || 30) * 0.6;
            const textElement = d3.select(this);

            textElement
                .attr('font-size', style.textSize ? `${style.textSize}px` : null)
                .attr('font-weight', style.textBold ? 'bold' : null)
                .attr('font-style', style.textItalic ? 'italic' : null)
                .attr('font-family', style.fontFamily || null);

            const posConfig = {
                'top-left': { anchor: 'start', x: -size, y: -size, dy: '1em' },
                'top-center': { anchor: 'middle', x: 0, y: -size, dy: '1em' },
                'top-right': { anchor: 'end', x: size, y: -size, dy: '1em' },
                'middle-left': { anchor: 'start', x: -size, y: 0, dy: '0.35em' },
                'center': { anchor: 'middle', x: 0, y: 0, dy: '0.35em' },
                'middle-right': { anchor: 'end', x: size, y: 0, dy: '0.35em' },
                'bottom-left': { anchor: 'start', x: -size, y: size, dy: '-0.2em' },
                'bottom-center': { anchor: 'middle', x: 0, y: size, dy: '-0.2em' },
                'bottom-right': { anchor: 'end', x: size, y: size, dy: '-0.2em' },
                'default': { anchor: 'middle', x: 0, y: d.size, dy: '0.71em' }
            };
            const config = posConfig[style.textLocation] || posConfig['default'];
            textElement.attr('text-anchor', config.anchor).attr('x', config.x).attr('y', config.y).attr('dy', config.dy);
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
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

    g.selectAll('path.curved-link').attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Make curve less pronounced
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    });

    g.selectAll('path.elbowed-link').attr('d', createOrthogonalPath);
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