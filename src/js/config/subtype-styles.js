/**
 * Default visual styles by Type/SubType.
 * These serve as sensible defaults so styling is primarily driven by SubType,
 * while remaining fully overridable by user-defined styling rules (customStyle).
 */

// Palette chosen for good contrast on light/dark themes; tweak as needed.
const ACTION_SUBTYPE_STYLES = {
    'Form Incoming': { strokeColor: '#1e88e5', fillColor: '#bbdefb' },
    'Call Outgoing': { strokeColor: '#fb8c00', fillColor: '#ffe0b2' },
    'Call Incoming': { strokeColor: '#fb8c00', fillColor: '#ffe0b2' },
    'SMS Outgoing': { strokeColor: '#8e24aa', fillColor: '#e1bee7' },
    'Mail Outgoing': { strokeColor: '#43a047', fillColor: '#dcedc8' },
    'Mail Incoming': { strokeColor: '#2e7d32', fillColor: '#c8e6c9' },
    'Video Incoming': { strokeColor: '#7e57c2', fillColor: '#d1c4e9' },
    'Physical Displacement': { strokeColor: '#6d4c41', fillColor: '#d7ccc8' },
    default: { strokeColor: '#546e7a', fillColor: '#eceff1' }
};

const STATE_SUBTYPE_STYLES = {
    Out: { strokeColor: '#c62828', fillColor: '#ffebee' },
    'End of Contract': { strokeColor: '#6a1b9a', fillColor: '#ede7f6' },
    default: { strokeColor: '#455a64', fillColor: '#eceff1' }
};

const DECISION_SUBTYPE_STYLES = {
    'Automatic Verification': { strokeColor: '#5d4037', fillColor: '#efebe9' },
    'Manual Verification': { strokeColor: '#5d4037', fillColor: '#efebe9' },
    Checkpoint: { strokeColor: '#5d4037', fillColor: '#efebe9' },
    Performance: { strokeColor: '#5d4037', fillColor: '#efebe9' },
    default: { strokeColor: '#5d4037', fillColor: '#efebe9' }
};

const TYPE_DEFAULTS = {
    Resource: { strokeColor: '#3949ab', fillColor: '#e8eaf6' },
    Action: ACTION_SUBTYPE_STYLES.default,
    State: STATE_SUBTYPE_STYLES.default,
    Decision: DECISION_SUBTYPE_STYLES.default,
    default: { strokeColor: 'rgba(40,45,54,0.65)', fillColor: 'rgba(255,255,255,0.85)' }
};

/**
 * Returns default styles for a node based on Type/SubType.
 * @param {{Type?: string, type?: string, SubType?: string, subType?: string}} node
 * @returns {{strokeColor?: string, fillColor?: string, strokeWidth?: number}}
 */
export function getDefaultNodeStyle(node) {
    const type = node?.Type || node?.type || 'default';
    const subType = node?.SubType || node?.subType;

    if (type === 'Action') {
        const preset = ACTION_SUBTYPE_STYLES[subType] || ACTION_SUBTYPE_STYLES.default;
        return { ...preset };
    }
    if (type === 'State') {
        const preset = STATE_SUBTYPE_STYLES[subType] || STATE_SUBTYPE_STYLES.default;
        return { ...preset };
    }
    if (type === 'Decision') {
        const preset = DECISION_SUBTYPE_STYLES[subType] || DECISION_SUBTYPE_STYLES.default;
        return { ...preset };
    }

    return { ...(TYPE_DEFAULTS[type] || TYPE_DEFAULTS.default) };
}

/**
 * Convenience accessor to get a stroke color for links, using the source node subtype
 * when available and falling back to theme border color or a neutral grey.
 * @param {any} link - d3 link datum with .source node
 * @param {string} [fallback] - Optional CSS color fallback
 */
export function getDefaultLinkStroke(link, fallback) {
    const src = link?.source;
    if (src) {
        const s = getDefaultNodeStyle(src);
        if (s?.strokeColor) return s.strokeColor;
    }
    if (fallback) return fallback;
    const themeBorder = typeof window !== 'undefined' && window.getComputedStyle
        ? getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim()
        : '';
    return themeBorder || '#999';
}
