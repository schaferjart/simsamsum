import * as d3 from 'd3';

const BASELINE_OFFSET = 20;
const LINE_SPACING_EM = 1.1;
const LINE_SPACING_PX = 14;

/**
 * @module render/label-renderer
 * This module is responsible for rendering text labels on the nodes.
 */

/**
 * Renders the labels for each node.
 * @param {d3.Selection} g - The main D3 group containing the node elements.
 */
export function renderLabels(g) {
    if (!g) return;
    const node = g.selectAll('.node');

    // Node labels
    node.append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', d => (d?.size ?? 0) + BASELINE_OFFSET)
        .each(function (d) {
            const selection = d3.select(this);
            const label = (d?.Name ?? '').toString().trim();
            const size = Math.max(40, d?.size ?? 40);
            const maxWidth = Math.max(160, size * 3);
            const lines = wrapText(selection, label, maxWidth);
            d._labelLineCount = lines;
        });

    // Supplementary info labels (e.g., cost)
    node.append('text')
        .attr('class', 'supplementary-info')
        .attr('text-anchor', 'middle')
        .attr('dy', d => {
            const size = Math.max(40, d?.size ?? 40);
            const lineCount = Math.max(1, d?._labelLineCount ?? 1);
            const extra = (lineCount - 1) * LINE_SPACING_PX;
            return size + BASELINE_OFFSET + 15 + extra;
        })
        .text(d => {
            const cost = d?.["Effective Cost"] ?? d?.["Ø Cost"];
            return cost ? `€${cost}` : '';
        });
}

function wrapText(selection, textValue, maxWidth) {
    const text = (textValue ?? '').trim();
    if (!text) {
        selection.text('');
        return 0;
    }

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        selection.text(text);
        return 1;
    }

    selection.text(null);

    let line = [];
    let lineCount = 1;
    let tspan = selection.append('tspan')
        .attr('x', 0)
        .attr('dy', '0em');

    words.forEach(word => {
        line.push(word);
        tspan.text(line.join(' '));

        if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            lineCount += 1;
            tspan = selection.append('tspan')
                .attr('x', 0)
                .attr('dy', `${LINE_SPACING_EM}em`)
                .text(word);
        }
    });

    if (line.length === 0) {
        tspan.text('');
        lineCount = 0;
    }

    return lineCount;
}