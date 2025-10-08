const FILTER_SETS_API_BASE = '/api/filter-sets';

// Import UI functions for filter set operations
let _getFilterRules = null;
let _getStylingRules = null;
let _addFilterRule = null;
let _addStylingRule = null;

/**
 * Initialize the API client with UI function dependencies.
 * This should be called during app initialization.
 */
export function initializeApiClient(dependencies) {
    _getFilterRules = dependencies.getFilterRules;
    _getStylingRules = dependencies.getStylingRules;
    _addFilterRule = dependencies.addFilterRule;
    _addStylingRule = dependencies.addStylingRule;
}

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

/**
 * High-level wrapper to save a filter set.
 * Collects current filter and styling rules and saves them to the server.
 * @param {string} name - The name for the filter set.
 * @returns {Promise<boolean>} A promise that resolves to true if successful.
 */
export async function saveFilterSet(name) {
    try {
        const filters = _getFilterRules ? _getFilterRules() : [];
        const allStylingRules = _getStylingRules ? _getStylingRules() : [];
        
        // Filter out styling rules that duplicate filter-embedded styles
        // Only save standalone styling rules (those in the "Styling Rules" section)
        // Filters already contain their own styling via the 'style' property
        const standaloneStyleRules = allStylingRules
            .filter(styleRule => {
                // Check if this styling rule matches any filter rule
                const isDuplicate = filters.some(filter => {
                    // A styling rule is a duplicate if it has the same condition as a filter with styling
                    return filter.style && 
                           filter.scope === styleRule.scope &&
                           filter.column === styleRule.condition?.column &&
                           filter.operator === styleRule.condition?.operator &&
                           String(filter.value) === String(styleRule.condition?.value);
                });
                return !isDuplicate;
            })
            .map(styleRule => {
                // Convert from nested format to flat format for storage
                // From: { scope, condition: {column, operator, value}, style: {color, strokeWidth} }
                // To: { scope, column, operator, value, color, strokeWidth }
                const flattened = {
                    scope: styleRule.scope,
                    column: styleRule.condition?.column,
                    operator: styleRule.condition?.operator,
                    value: styleRule.condition?.value
                };
                
                if (styleRule.style?.color) {
                    flattened.color = styleRule.style.color;
                }
                if (styleRule.style?.strokeWidth) {
                    flattened.strokeWidth = styleRule.style.strokeWidth;
                }
                
                return flattened;
            });
        
        await saveFilterSetData(name, {
            filters,
            styling: standaloneStyleRules,
            timestamp: new Date().toISOString()
        });
        
        console.log(`Filter set "${name}" saved successfully`);
        await populateFilterSetsDropdown();
        return true;
    } catch (error) {
        console.error(`Failed to save filter set "${name}":`, error);
        return false;
    }
}

/**
 * High-level wrapper to load a filter set.
 * Fetches the filter set from the server and applies it to the UI.
 * @param {string} name - The name of the filter set to load.
 * @returns {Promise<boolean>} A promise that resolves to true if successful.
 */
export async function loadFilterSet(name) {
    try {
        const filterSet = await fetchFilterSet(name);
        
        if (!filterSet) {
            console.error(`Filter set "${name}" not found`);
            return false;
        }
        
        // Clear existing rules
        const filterContainer = document.getElementById('filter-rules-container');
        const stylingContainer = document.getElementById('styling-rules-container');
        if (filterContainer) filterContainer.innerHTML = '';
        if (stylingContainer) stylingContainer.innerHTML = '';
        
        // Load filters
        if (Array.isArray(filterSet.filters) && _addFilterRule) {
            filterSet.filters.forEach(filter => {
                _addFilterRule(filter, null);  // (rule, onChange, autoScope)
            });
        }
        
        // Load styling rules
        if (Array.isArray(filterSet.styling) && _addStylingRule) {
            filterSet.styling.forEach(style => {
                _addStylingRule(style, null);  // (rule, onChange)
            });
        }
        
        console.log(`Filter set "${name}" loaded successfully`);
        return true;
    } catch (error) {
        console.error(`Failed to load filter set "${name}":`, error);
        return false;
    }
}

/**
 * High-level wrapper to delete a filter set.
 * Deletes the filter set from the server and updates the dropdown.
 * @param {string} name - The name of the filter set to delete.
 * @returns {Promise<boolean>} A promise that resolves to true if successful.
 */
export async function deleteFilterSet(name) {
    try {
        await deleteFilterSetData(name);
        console.log(`Filter set "${name}" deleted successfully`);
        await populateFilterSetsDropdown();
        return true;
    } catch (error) {
        console.error(`Failed to delete filter set "${name}":`, error);
        return false;
    }
}

/**
 * Populates the filter sets dropdown with available filter sets from the server.
 */
export async function populateFilterSetsDropdown() {
    const select = document.getElementById('filterSetsSelect');
    if (!select) return;
    
    try {
        const filterSets = await fetchAllFilterSets();
        
        // Clear existing options except the first placeholder
        select.innerHTML = '<option value="">Load Filter Set...</option>';
        
        // Add new options
        filterSets.forEach(set => {
            const option = document.createElement('option');
            option.value = set.name;
            option.textContent = set.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to populate filter sets dropdown:', error);
    }
}