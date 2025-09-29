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

    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'status-message';
        }, 4000);
    }
}

/**
 * Calculates the size of a node based on its cost.
 * Uses logarithmic scaling to keep sizes within a reasonable range.
 * @param {number} cost - The cost value of the node.
 * @param {boolean} useCostBasedSizing - Flag to determine if sizing is based on cost or uniform.
 * @returns {number} The calculated size of the node.
 */
export function calculateNodeSize(cost, useCostBasedSizing) {
    if (!useCostBasedSizing) {
        return 40; // Uniform size
    }

    if (cost === null || cost === undefined || isNaN(cost) || cost <= 0) {
        return 30; // Default size for nodes without a valid cost
    }

    const minSize = 20;
    const maxSize = 80;
    const maxCost = 120; // Based on sample data max, can be adjusted

    const logScale = Math.log(cost + 1) / Math.log(maxCost + 1);
    return minSize + (logScale * (maxSize - minSize));
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