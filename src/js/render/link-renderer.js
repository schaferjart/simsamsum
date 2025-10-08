/**
 * @module render/link-renderer
 * This module is responsible for rendering the links (connections) in the visualization.
 */
import * as d3 from 'd3';

/**
 * Creates an SVG path string for an orthogonal link between two nodes.
 * @param {object} d - The link data object.
 * @returns {string} The SVG path data string.
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
 * Renders the links (lines or paths) in the SVG container.
 * @param {d3.Selection} g - The main D3 group element for rendering.
 * @param {Array<Object>} links - The array of link data.
 * @param {string} currentLayout - The current layout type, which determines the link style.
 */
export function renderLinks(g, links, currentLayout) {
    const linkGroup = g.append('g').attr('class', 'links');

    if (currentLayout === 'hierarchical-orthogonal') {
        linkGroup.selectAll('path')
            .data(links)
            .enter().append('path')
            .attr('class', d => {
                let classes = 'link orthogonal-link';
                if (d.filterStyle) {
                    if (d.filterStyle.highlighted) classes += ' highlighted';
                    if (d.filterStyle.dimmed) classes += ' dimmed';
                }
                return classes;
            })
            .attr('fill', 'none')
            .attr('stroke', d => (d.customStyle && d.customStyle.color) || getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim() || '#999')
            .attr('stroke-width', d => (d.customStyle && d.customStyle.strokeWidth) || 2)
            .attr('marker-end', 'url(#arrowhead)')
            .each(function(d) {
                if (d.customStyle) {
                    const element = d3.select(this);
                    if (d.customStyle.color) element.node().style.setProperty('stroke', d.customStyle.color, 'important');
                    if (d.customStyle.strokeWidth) element.node().style.setProperty('stroke-width', d.customStyle.strokeWidth + 'px', 'important');
                }
            });
    } else {
        linkGroup.selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('class', d => {
                let classes = 'link';
                if (d.filterStyle) {
                    if (d.filterStyle.highlighted) classes += ' highlighted';
                    if (d.filterStyle.dimmed) classes += ' dimmed';
                }
                return classes;
            })
            .attr('stroke', d => (d.customStyle && d.customStyle.color) || '#999')
            .attr('stroke-width', d => (d.customStyle && d.customStyle.strokeWidth) || 2)
            .attr('marker-end', 'url(#arrowhead)')
            .each(function(d) {
                if (d.customStyle) {
                    if (d.customStyle.color) this.style.setProperty('stroke', d.customStyle.color, 'important');
                    if (d.customStyle.strokeWidth) this.style.setProperty('stroke-width', d.customStyle.strokeWidth + 'px', 'important');
                }
            });
    }
}

/**
 * Updates the positions of the links based on the current node positions.
 * @param {d3.Selection} g - The main D3 group element.
 */
export function updateLinkPaths(g) {
    if (!g) return;

    g.selectAll('line.link')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    g.selectAll('path.link').attr('d', createOrthogonalPath);
}