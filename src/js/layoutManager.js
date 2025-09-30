/**
 * @module layoutManager
 * Manages saving, loading, and listing of graph layouts via API calls.
 */

const API_BASE_URL = '/api'; // Use relative path for Vite proxy

// Helpers
const staticLayoutUrl = (name) => `./data/layouts/${name}.json`;
const localKey = (name) => `layout:${name}`;

async function tryParseJsonResponse(response) {
    // Some servers may return HTML (e.g., index.html) on 404; check content-type
    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json') || ct.includes('text/json')) {
        return await response.json();
    }
    // Fallback: attempt text then parse, but guard against HTML
    const text = await response.text();
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of JSON');
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error('Invalid JSON response');
    }
}

function normalizePositions(data) {
    if (!data) return null;
    // If wrapped as { positions: { id: {x,y} } }
    if (data && typeof data === 'object' && !Array.isArray(data) && data.positions && typeof data.positions === 'object') {
        return data.positions;
    }
    // If array of { id, x, y }
    if (Array.isArray(data)) {
        const map = {};
        data.forEach(item => {
            const id = item?.id;
            if (id && typeof item.x === 'number' && typeof item.y === 'number') {
                map[id] = { x: item.x, y: item.y };
            }
        });
        return Object.keys(map).length ? map : null;
    }
    // Assume already map { id: {x,y} }
    return data;
}

/**
 * Fetches the list of available layout names from the server.
 * @returns {Promise<string[]>} A promise that resolves to an array of layout names.
 */
export async function getLayouts() {
    try {
        const response = await fetch(`${API_BASE_URL}/layouts`);
        if (response.ok) {
            const parsed = await tryParseJsonResponse(response);
            const normalized = normalizePositions(parsed);
            return Array.isArray(parsed) ? parsed : normalized; // getLayouts expects names array; passthrough
        }
        throw new Error(`Failed to fetch layouts: ${response.status} ${response.statusText}`);
    } catch (error) {
        console.warn('[Layouts] API unavailable, falling back. Reason:', error?.message || error);
        const names = new Set();
        // Discover statically available known defaults
        try {
            const res = await fetch(staticLayoutUrl('default'));
            if (res.ok) names.add('default');
        } catch {}
        // Include any locally saved layouts
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('layout:')) {
                    names.add(key.replace('layout:', ''));
                }
            }
        } catch {}
        return Array.from(names);
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
        if (response.ok) {
            const parsed = await tryParseJsonResponse(response);
            return normalizePositions(parsed);
        }
        if (response.status === 404) {
            console.log(`Layout "${name}" not found on API, trying fallbacks...`);
        } else {
            throw new Error(`API error ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.warn(`Error loading layout "${name}" from API:`, error?.message || error);
    }

    // Fallback 1: static file in data/layouts
    try {
        const res = await fetch(staticLayoutUrl(name));
        if (res.ok) {
            const parsed = await tryParseJsonResponse(res);
            return normalizePositions(parsed);
        }
    } catch {}

    // Fallback 2: localStorage
    try {
        const stored = localStorage.getItem(localKey(name));
        if (stored) {
            const parsed = JSON.parse(stored);
            return normalizePositions(parsed);
        }
    } catch {}

    return null;
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
        // Also persist to localStorage as backup
        try { localStorage.setItem(localKey(name), JSON.stringify(positions)); } catch {}
        return true;
    } catch (error) {
        console.warn(`Error saving layout "${name}" to API:`, error?.message || error);
        // Best-effort local fallback so users don't lose work
        try {
            localStorage.setItem(localKey(name), JSON.stringify(positions));
            console.log(`Layout "${name}" saved locally (offline mode).`);
            return true;
        } catch (e) {
            console.error('Failed to save layout locally as well:', e);
            return false;
        }
    }
}