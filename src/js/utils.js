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
 * Triggers a browser download for a JSON object as a file.
 * @param {object} data - The JSON object to download.
 * @param {string} filename - The desired name for the downloaded file.
 */
export function downloadJsonFile(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
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