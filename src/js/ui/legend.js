import * as d3 from 'd3';
import { drawNodeShape } from '../render/shape-library.js';
import { NODE_LEGEND_GROUPS, EXECUTION_LEGEND_ITEMS } from '../config/legend-config.js';
import { getBorderStyle } from '../utils.js';

const ICON_SIZE = 32;
const VIEWBOX_HALF = 16;

function createGroupHeading(container, title) {
    const heading = document.createElement('h4');
    heading.textContent = title;
    container.appendChild(heading);
}

function createLegendItem(label) {
    const item = document.createElement('div');
    item.className = 'legend-item';

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'legend-icon';
    item.appendChild(iconWrapper);

    const text = document.createElement('span');
    text.textContent = label;
    item.appendChild(text);

    return { item, iconWrapper };
}

function renderNodeIcon(iconWrapper, entry) {
    const svg = d3.select(iconWrapper)
        .append('svg')
        .attr('class', 'legend-icon-svg')
        .attr('width', ICON_SIZE)
        .attr('height', ICON_SIZE)
        .attr('viewBox', `${-VIEWBOX_HALF} ${-VIEWBOX_HALF} ${VIEWBOX_HALF * 2} ${VIEWBOX_HALF * 2}`);

    const group = svg.append('g');
    const nodeData = {
        Type: entry.type,
        SubType: entry.subType,
        size: entry.size ?? 24,
        borderStyle: entry.borderStyle
    };

    drawNodeShape(group, nodeData, {
        fillColor: entry.fillColor,
        strokeColor: entry.strokeColor,
        strokeWidth: entry.strokeWidth,
        borderStyle: entry.borderStyle
    });
}

function renderExecutionIcon(iconWrapper, entry) {
    const svg = d3.select(iconWrapper)
        .append('svg')
        .attr('class', 'legend-icon-svg')
        .attr('width', ICON_SIZE)
        .attr('height', ICON_SIZE)
        .attr('viewBox', `${-VIEWBOX_HALF} ${-VIEWBOX_HALF} ${VIEWBOX_HALF * 2} ${VIEWBOX_HALF * 2}`);

    const stroke = entry.strokeColor ?? 'rgba(40, 45, 54, 0.8)';
    const dasharray = entry.borderStyle ?? getBorderStyle(entry.execution);

    svg.append('line')
        .attr('x1', -12)
        .attr('x2', 12)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', stroke)
        .attr('stroke-width', entry.strokeWidth ?? 2)
        .attr('stroke-dasharray', dasharray === 'none' ? null : dasharray)
        .attr('vector-effect', 'non-scaling-stroke');
}

function clearContainer(container) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

function renderNodeGroups(container) {
    NODE_LEGEND_GROUPS.forEach(groupConfig => {
        if (!groupConfig || groupConfig.hidden) return;
        const visibleItems = (groupConfig.items || []).filter(item => !item?.hidden);
        if (visibleItems.length === 0) return;

        createGroupHeading(container, groupConfig.title ?? 'Node Types');

        visibleItems.forEach(itemConfig => {
            const { item, iconWrapper } = createLegendItem(itemConfig.label ?? itemConfig.subType ?? itemConfig.type);
            renderNodeIcon(iconWrapper, itemConfig);
            container.appendChild(item);
        });
    });
}

function renderExecutionGroup(container) {
    if (!EXECUTION_LEGEND_ITEMS || EXECUTION_LEGEND_ITEMS.length === 0) return;
    createGroupHeading(container, 'Execution Types');

    EXECUTION_LEGEND_ITEMS.filter(item => !item?.hidden).forEach(itemConfig => {
        const { item, iconWrapper } = createLegendItem(itemConfig.label ?? itemConfig.execution);
        renderExecutionIcon(iconWrapper, itemConfig);
        container.appendChild(item);
    });
}

/**
 * Renders the dynamic legend using shared shape definitions.
 * @param {HTMLElement|string} containerOrId - Container element or its ID.
 */
export function renderLegend(containerOrId = 'legendContainer') {
    const container = typeof containerOrId === 'string'
        ? document.getElementById(containerOrId)
        : containerOrId;

    if (!container) return;
    clearContainer(container);

    container.classList.add('legend--dynamic');

    renderNodeGroups(container);
    renderExecutionGroup(container);
}
