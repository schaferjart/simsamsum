/**
 * Displays a status message to the user.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of message (e.g., 'info', 'success', 'error').
 */
export function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;

    if (type === 'success' || type === 'error' || type === 'warning') {
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'status-message';
        }, 4000);
    }
}

/**
 * Calculates the size of a node based on a numeric value.
 * Uses logarithmic scaling to balance large ranges and keeps output
 * constrained between configured minimum and maximum sizes.
 *
 * @param {number|null|undefined} rawValue - The numeric value to scale.
 * @param {object} [sizingConfig={}] - Configuration controlling scaling behaviour.
 * @param {boolean} [sizingConfig.enabled=true] - Whether dynamic sizing is active.
 * @param {number|null} [sizingConfig.minValue=null] - Minimum dataset value for scaling.
 * @param {number|null} [sizingConfig.maxValue=null] - Maximum dataset value for scaling.
 * @param {number} [sizingConfig.baseSize=40] - Size to use when sizing disabled or value missing.
 * @param {number} [sizingConfig.minSize=24] - Minimum rendered size when sizing enabled.
 * @param {number} [sizingConfig.maxSize=90] - Maximum rendered size when sizing enabled.
 * @returns {number} The calculated node size in pixels.
 */
export function calculateNodeSize(rawValue, sizingConfig = {}) {
    const {
        enabled = true,
        minValue = null,
        maxValue = null,
        baseSize = 40,
        minSize = 24,
        maxSize = 90,
        zeroSize = 10
    } = sizingConfig || {};

    if (!enabled) {
        return baseSize;
    }

    const numericValue = (() => {
        if (typeof rawValue === 'number' && !Number.isNaN(rawValue)) return rawValue;
        if (typeof rawValue === 'string') {
            const cleaned = rawValue.replace(/,/g, '').trim();
            if (cleaned === '') return null;
            const parsed = Number(cleaned);
            return Number.isNaN(parsed) ? null : parsed;
        }
        const coerced = Number(rawValue);
        return Number.isNaN(coerced) ? null : coerced;
    })();

    if (numericValue === null || Number.isNaN(numericValue)) {
        return baseSize;
    }

    if (numericValue <= 0) {
        return Math.max(0, zeroSize);
    }

    const safeMin = (typeof minValue === 'number' && !Number.isNaN(minValue)) ? minValue : numericValue;
    const safeMaxCandidate = (typeof maxValue === 'number' && !Number.isNaN(maxValue)) ? maxValue : numericValue;
    const safeMax = safeMaxCandidate > safeMin ? safeMaxCandidate : safeMin + 1;

    const clampedValue = Math.max(numericValue, safeMin);
    const span = safeMax - safeMin;

    let normalized;
    if (span <= 0 || !Number.isFinite(span)) {
        normalized = 0.5;
    } else {
        const relative = clampedValue - safeMin;
        normalized = Math.log(relative + 1) / Math.log(span + 1);
    }

    if (!Number.isFinite(normalized)) {
        normalized = 0.5;
    }

    const scaled = minSize + normalized * (maxSize - minSize);
    return Math.max(minSize, Math.min(maxSize, scaled));
}

/**
 * Determines the SVG stroke-dasharray property for a node's border based on execution type.
 * @param {string} execution - The execution type of the node.
 * @returns {string} The stroke-dasharray value.
 */
export function getBorderStyle(execution) {
    if (!execution) return "none";

    switch (execution.toLowerCase()) {
        case "automatic":
            return "none"; // Solid border
        case "applicant":
            return "2,3"; // Dotted border
        default:
            return "5,5"; // Dashed border (for Manual, Noemie, etc.)
    }
}

/**
 * Snaps a coordinate to the nearest grid line.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {number} gridSize - The size of the grid cells.
 * @returns {{x: number, y: number}} The snapped coordinates.
 */
export function snapToGrid(x, y, gridSize) {
    return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize
    };
}

/**
 * Triggers a browser download for JSON content as a file.
 * Accepts either a JSON string or a plain object (which will be stringified).
 * @param {object|string} dataOrString - JSON object to stringify or an already-stringified JSON string.
 * @param {string} filename - The desired name for the downloaded file.
 */
export function downloadJsonFile(dataOrString, filename) {
    const jsonString = typeof dataOrString === 'string'
        ? dataOrString
        : JSON.stringify(dataOrString, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Converts a human-readable name to a valid ID format.
 * Example: "Application Review 4" -> "application_review_4"
 * @param {string} name - The name to convert
 * @returns {string} The generated ID
 */
export function generateIdFromName(name) {
    if (!name || typeof name !== 'string') {
        return `element_${Date.now()}`; // Fallback for empty names
    }
    
    return name
        .toLowerCase()                    // Convert to lowercase
        .trim()                          // Remove leading/trailing spaces
        .replace(/[^a-z0-9\s]/g, '')     // Remove special characters, keep letters, numbers, spaces
        .replace(/\s+/g, '_')            // Replace spaces with underscores
        .replace(/_{2,}/g, '_')          // Replace multiple underscores with single
        .replace(/^_|_$/g, '');          // Remove leading/trailing underscores
}