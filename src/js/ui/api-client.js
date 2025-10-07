const FILTER_SETS_API_BASE = '/api/filter-sets';

/**
 * Fetches all available filter sets from the server.
 * @returns {Promise<Array>} A promise that resolves to an array of filter sets.
 */
export async function fetchAllFilterSets() {
    const response = await fetch(FILTER_SETS_API_BASE);
    if (!response.ok) {
        throw new Error(`Failed to fetch filter sets: HTTP ${response.status}`);
    }
    const payload = await response.json();
    return Array.isArray(payload) ? payload : payload.filterSets || [];
}

/**
 * Fetches a single named filter set from the server.
 * @param {string} name - The name of the filter set to fetch.
 * @returns {Promise<object>} A promise that resolves to the filter set object.
 */
export async function fetchFilterSet(name) {
    const response = await fetch(`${FILTER_SETS_API_BASE}/${encodeURIComponent(name)}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch filter set "${name}": HTTP ${response.status}`);
    }
    const payload = await response.json();
    return payload?.filterSet;
}

/**
 * Saves a filter set to the server.
 * @param {string} name - The name for the filter set.
 * @param {object} payload - The filter set data ({ filters, styling }).
 * @returns {Promise<object>} A promise that resolves to the saved filter set data.
 */
export async function saveFilterSetData(name, payload) {
    const response = await fetch(`${FILTER_SETS_API_BASE}/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Failed to save filter set "${name}": HTTP ${response.status}`);
    }
    const result = await response.json();
    return result?.filterSet || {};
}

/**
 * Deletes a named filter set from the server.
 * @param {string} name - The name of the filter set to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 */
export async function deleteFilterSetData(name) {
    const response = await fetch(`${FILTER_SETS_API_BASE}/${encodeURIComponent(name)}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        throw new Error(`Failed to delete filter set "${name}": HTTP ${response.status}`);
    }
}