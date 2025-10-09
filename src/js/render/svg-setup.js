/**
 * @module render/svg-setup
 * This module is responsible for setting up the main SVG container,
 * zoom behavior, and other one-time visualization initializations.
 */
import * as d3 from 'd3';

/**
 * Adds zoom controls to the visualization.
 * @param {d3.Selection} svg - The main SVG selection.
 * @param {d3.ZoomBehavior} zoom - The D3 zoom behavior.
 * @private
 */
function addZoomControls(svg, zoom, onHomeClick) {
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
            if (typeof onHomeClick === 'function') {
                onHomeClick();
            } else {
                svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
            }
        });
}

/**
 * Initializes the main SVG container and zoom capabilities.
 * @param {HTMLElement} container - The container element for the graph.
 * @param {function} onZoom - Callback function for zoom events.
 * @param {function} onBackgroundClick - Callback for clicks on the SVG background.
 * @returns {object} { svg, zoomGroup, g, zoom, width, height }
 */
export function initVisualization(container, onZoom, onBackgroundClick, onHomeClick) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(container).select('svg').remove();

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    svg.append('defs').selectAll('marker')
        .data(['arrowhead'])
        .enter().append('marker')
        .attr('id', d => d)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 18)
        .attr('refY', 5)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('text')
        .attr('x', 5)
        .attr('y', 6)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10')
        .attr('font-weight', 'bold')
        .attr('fill', getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#626c7c')
        .text('ᐳ');

    const zoom = d3.zoom()
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

    const zoomGroup = svg.append('g');
    const g = zoomGroup.append('g');

    addZoomControls(svg, zoom, onHomeClick);

    return { svg, zoomGroup, g, zoom, width, height };
}