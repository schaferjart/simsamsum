/**
 * @module layoutManager
 * Manages saving, loading, and listing of graph layouts via API calls.
 */

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Fetches the list of available layout names from the server.
 * @returns {Promise<string[]>} A promise that resolves to an array of layout names.
 */
export async function getLayouts() {
    try {
        const response = await fetch(`${API_BASE_URL}/layouts`);
        if (!response.ok) {
            throw new Error(`Failed to fetch layouts: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error getting layouts:', error);
        return [];
    }
}

/**
 * Loads a specific layout's node positions from the server.
 * @param {string} name - The name of the layout to load.
 * @returns {Promise<object|null>} A promise that resolves to the positions object or null on error.
 */
export async function loadLayout(name) {
    if (!name) return null;
    try {
        const response = await fetch(`${API_BASE_URL}/layouts/${name}`);
        if (response.status === 404) {
            console.log(`Layout "${name}" not found.`);
            return null;
        }
        if (!response.ok) {
            throw new Error(`Failed to load layout "${name}": ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading layout "${name}":`, error);
        return null;
    }
}

/**
 * Saves the current node positions to a named layout on the server.
 * @param {string} name - The name to save the layout under.
 * @param {object} positions - The positions object { nodeId: { x, y } }.
 * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
 */
export async function saveLayout(name, positions) {
    if (!name) {
        console.error('Layout name cannot be empty.');
        return false;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/layouts/${name}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ positions }),
        });
        if (!response.ok) {
            throw new Error(`Failed to save layout "${name}": ${response.statusText}`);
        }
        console.log(`Layout "${name}" saved successfully.`);
        return true;
    } catch (error) {
        console.error(`Error saving layout "${name}":`, error);
        return false;
    }
}

/**
 * Loads the default layout. For this application, we'll consider "default"
 * as the layout to load automatically.
 * @returns {Promise<object|null>} A promise that resolves to the default layout's positions or null.
 */
export async function loadDefaultLayout() {
    console.log('Attempting to load default layout...');
    return await loadLayout('default');
}