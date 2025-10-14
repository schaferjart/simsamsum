/**
 * @module render/label-renderer
 * This module is responsible for rendering text labels on the nodes.
 */

/**
 * Renders the labels for each node.
 * @param {d3.Selection} g - The main D3 group containing the node elements.
 */
export function renderLabels(g) {
    const node = g.selectAll('.node');

    // Node labels
    node.append('text')
        .attr('class', 'node-label')
        .attr('dy', d => d.size + 20)
        .attr('text-anchor', 'middle')
        .text(d => d.Name.length > 150 ? d.Name.substring(0, 150) + '...' : d.Name);

    // Supplementary info labels
    node.append('text')
        .attr('class', 'supplementary-info')
        .attr('dy', d => d.size + 35)
        .attr('text-anchor', 'middle')
        .text(d => {
            const cost = d["Effective Cost"] || d["Ø Cost"];
            return cost ? `€${cost}` : '';
        });
}