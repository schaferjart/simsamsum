const BASE_MIN_SIZE = 10;
const ELEMENT_SELECTOR = 'path,rect,circle,ellipse,polygon,polyline,line';

const DEFAULT_FILL = 'rgba(255, 255, 255, 0.85)';
const DEFAULT_STROKE = 'rgba(40, 45, 54, 0.65)';
const DEFAULT_STROKE_WIDTH = .2;

const ROUND = (value, decimals = 3) => Number.parseFloat(value.toFixed(decimals));

function normalizeSize(size) {
    return (typeof size === 'number' && !Number.isNaN(size))
        ? Math.max(BASE_MIN_SIZE, size)
        : 30;
}

// ===== Shape creators =====
function createSquare(nodeGroup, size) {
    return nodeGroup.append('rect')
        .attr('width', size)
        .attr('height', size)
        .attr('x', -size / 2)
        .attr('y', -size / 2)
        .attr('class', 'node-shape');
}

function createCircle(nodeGroup, radius) {
    return nodeGroup.append('circle')
        .attr('r', radius)
        .attr('class', 'node-shape');
}

function createPath(nodeGroup, d) {
    return nodeGroup.append('path')
        .attr('d', d)
        .attr('class', 'node-shape');
}

// ===== Equilateral Triangles =====
// Height = √3/2 * side
function trianglePoints(orientation, size) {
    const h = (Math.sqrt(3) / 2) * size;
    const halfW = size / 2;

    switch (orientation) {
        case 'up':
            return `M0,${ROUND(-h / 2)} L${ROUND(halfW)},${ROUND(h / 2)} L${ROUND(-halfW)},${ROUND(h / 2)} Z`;
        case 'down':
            return `M0,${ROUND(h / 2)} L${ROUND(halfW)},${ROUND(-h / 2)} L${ROUND(-halfW)},${ROUND(-h / 2)} Z`;
        case 'left':
            return `M${ROUND(-h / 2)},0 L${ROUND(h / 2)},${ROUND(-halfW)} L${ROUND(h / 2)},${ROUND(halfW)} Z`;
        case 'right':
            return `M${ROUND(h / 2)},0 L${ROUND(-h / 2)},${ROUND(-halfW)} L${ROUND(-h / 2)},${ROUND(halfW)} Z`;
        default:
            return '';
    }
}

function createTriangle(nodeGroup, size) {
    return createPath(nodeGroup, trianglePoints('up', size));
}

function createReversedTriangle(nodeGroup, size) {
    return createPath(nodeGroup, trianglePoints('down', size));
}

function createLeftTriangle(nodeGroup, size) {
    return createPath(nodeGroup, trianglePoints('left', size));
}

function createRightTriangle(nodeGroup, size) {
    return createPath(nodeGroup, trianglePoints('right', size));
}

function createDiamond(nodeGroup, size) {
    const d = size * 0.7;
    const path = `M0,${ROUND(-d)} L${ROUND(d)},0 L0,${ROUND(d)} L${ROUND(-d)},0 Z`;
    return createPath(nodeGroup, path);
}

// ===== Single Path Bold Cross =====
function createBoldCross(nodeGroup, size) {
    const arm = size * 0.4;
    const t = size * 0.15;

    // Single continuous path (outline of the whole cross)
    const path = `
        M${ROUND(-t)},${ROUND(-arm)}
        L${ROUND(t)},${ROUND(-arm)}
        L${ROUND(t)},${ROUND(-t)}
        L${ROUND(arm)},${ROUND(-t)}
        L${ROUND(arm)},${ROUND(t)}
        L${ROUND(t)},${ROUND(t)}
        L${ROUND(t)},${ROUND(arm)}
        L${ROUND(-t)},${ROUND(arm)}
        L${ROUND(-t)},${ROUND(t)}
        L${ROUND(-arm)},${ROUND(t)}
        L${ROUND(-arm)},${ROUND(-t)}
        L${ROUND(-t)},${ROUND(-t)} Z
    `;
    return createPath(nodeGroup, path);
}

function createDoubleCircle(nodeGroup, size) {
    const group = nodeGroup.append('g').attr('class', 'node-shape-group');
    const radius = size * 0.6;
    const innerRadius = radius * 0.6;

    group.append('circle')
        .attr('r', radius)
        .attr('class', 'node-shape node-shape-primary');

    group.append('circle')
        .attr('r', innerRadius)
        .attr('class', 'node-shape node-shape-overlay')
        .attr('data-fill', 'none');

    return group;
}

// ===== Shape Library =====
const SHAPE_LIBRARY = {
    Resource: {
        default: createSquare
    },
    Action: {
        'Form Incoming': createLeftTriangle,
        'SMS Outgoing': createRightTriangle,
        'Call Outgoing': createRightTriangle,
        'Call Incoming': createLeftTriangle,
        'Mail Outgoing': createRightTriangle,
        'Mail Incoming': createLeftTriangle,
        'Video Incoming': createLeftTriangle,
        'Physical Displacement': createReversedTriangle,
        default: createTriangle
    },
    State: {
        default: (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6)),
        Out: createBoldCross,
        'End of Contract': createDoubleCircle,
        Checkpoint: (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6)),
        Beachhead: (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6)),
        Fundraising: (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6)),
        'Yellow Card': (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6)),
        'Green Card': (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6)),
        'Informal Contact': (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6)),
        'Out End Of Contract NC': createBoldCross,
        'Case By Case': (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6))
    },
    Decision: {
        default: createDiamond,
        Checkpoint: createDiamond,
        'Manual Verification': createDiamond,
        'Automatic Verification': createDiamond,
        Performance: createDiamond
    },
    default: {
        default: (g, s) => createCircle(g, Math.max(BASE_MIN_SIZE / 2, s * 0.6))
    }
};

// ===== Helpers =====
function applyStyle(selection, styleOptions) {
    if (!selection || selection.empty?.()) return;

    const targets = selection.selectAll?.(ELEMENT_SELECTOR);
    const elements = targets && !targets.empty?.() ? targets : selection;

    elements.each(function () {
        const el = this;
        if (typeof SVGElement !== 'undefined' && !(el instanceof SVGElement)) return;

        const fillPref = el.getAttribute('data-fill');
        const strokePref = el.getAttribute('data-stroke');

        // Persist baseline styles so interactive states can restore them later
        el.setAttribute('data-base-fill', fillPref === 'none' ? 'none' : styleOptions.fillColor);
        el.setAttribute('data-base-stroke', strokePref || styleOptions.strokeColor);
        el.setAttribute('data-base-stroke-width', `${styleOptions.strokeWidth}`);

        el.setAttribute('fill', fillPref === 'none' ? 'none' : styleOptions.fillColor);
        el.setAttribute('stroke', strokePref || styleOptions.strokeColor);
        el.setAttribute('stroke-width', `${styleOptions.strokeWidth}`);

        if (styleOptions.borderStyle) {
            el.setAttribute('stroke-dasharray', styleOptions.borderStyle);
        } else {
            el.removeAttribute('stroke-dasharray');
        }
        el.setAttribute('vector-effect', 'non-scaling-stroke');
    });
}

function getShapeFactory(type, subType) {
    const typeGroup = SHAPE_LIBRARY[type] || SHAPE_LIBRARY.default;
    return typeGroup[subType] || typeGroup.default || SHAPE_LIBRARY.default.default;
}

export const KNOWN_SUBTYPE_LABELS = Array.from(new Set(
    Object.values(SHAPE_LIBRARY).flatMap(cfg => Object.keys(cfg))
        .filter(label => label !== 'default')
)).sort();

export function drawNodeShape(nodeGroup, nodeData, styleOptions = {}) {
    if (!nodeGroup) return null;

    const size = normalizeSize(nodeData?.size);
    const type = nodeData?.Type || nodeData?.type || 'default';
    const subType = nodeData?.SubType || nodeData?.subType;

    const factory = getShapeFactory(type, subType);
    const shapeSelection = factory(nodeGroup, size, nodeData);

    const resolvedFill = styleOptions.fillColor ?? DEFAULT_FILL;
    const resolvedStroke = styleOptions.strokeColor ?? DEFAULT_STROKE;
    const rawStrokeWidth = styleOptions.strokeWidth;
    const numericStrokeWidth = rawStrokeWidth !== undefined ? Number(rawStrokeWidth) : NaN;
    const resolvedStrokeWidth = Number.isFinite(numericStrokeWidth) ? numericStrokeWidth : DEFAULT_STROKE_WIDTH;

    applyStyle(shapeSelection, {
        fillColor: resolvedFill,
        strokeColor: resolvedStroke,
        strokeWidth: resolvedStrokeWidth,
        borderStyle: styleOptions.borderStyle ?? nodeData?.borderStyle ?? null
    });

    return shapeSelection;
}
