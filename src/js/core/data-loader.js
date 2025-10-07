/**
 * Load application data from JSON files in data/ directory (priority #1).
 * Returns the loaded data object or null if loading fails.
 */
export async function loadFromJsonFiles() {
    try {
        // Try to load via API server first
        try {
            const apiResponse = await fetch('/api/load-workflow');
            if (apiResponse.ok) {
                const data = await apiResponse.json();
                console.log('✅ Loaded from API server:', {
                    elements: data.elements?.length,
                    connections: data.connections?.length,
                    variables: Object.keys(data.variables || {}).length
                });
                return {
                    elements: Array.isArray(data.elements) ? data.elements : [],
                    connections: Array.isArray(data.connections) ? data.connections : [],
                    variables: data.variables && typeof data.variables === 'object' ? data.variables : {},
                };
            }
        } catch (apiError) {
            console.log('📁 API server not available, trying direct file access...');
        }

        // Fallback: try to load from data directory files directly
        const responses = await Promise.allSettled([
            fetch('./data/elements.json'),
            fetch('./data/connections.json'),
            fetch('./data/variables.json')
        ]);

        const [elementsRes, connectionsRes, variablesRes] = responses;
        if (elementsRes.status !== 'fulfilled' || !elementsRes.value.ok) {
            console.log('📁 No data/elements.json found, falling back.');
            return null;
        }

        const elements = await elementsRes.value.json();
        const connections = connectionsRes.status === 'fulfilled' && connectionsRes.value.ok
            ? await connectionsRes.value.json() : [];
        const variables = variablesRes.status === 'fulfilled' && variablesRes.value.ok
            ? await variablesRes.value.json() : {};

        console.log('✅ Loaded from JSON files:', {
            elements: elements.length,
            connections: connections.length,
            variables: Object.keys(variables).length
        });

        return {
            elements: Array.isArray(elements) ? elements : [],
            connections: Array.isArray(connections) ? connections : [],
            variables: variables && typeof variables === 'object' ? variables : {},
        };

    } catch (error) {
        console.log('📁 Failed to load from JSON files:', error.message);
        return null;
    }
}

/**
 * Load application data from localStorage (if present).
 * Returns the loaded data object or null if not found.
 */
export function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('workflowData');
        if (!saved) return null;
        const { elements, nodes, connections, variables } = JSON.parse(saved);

        // Support both new format (elements) and legacy format (nodes)
        const loadedElements = Array.isArray(elements) ? elements : (Array.isArray(nodes) ? nodes : []);

        return {
            elements: loadedElements,
            connections: Array.isArray(connections) ? connections : [],
            variables: variables && typeof variables === 'object' ? variables : {},
        };
    } catch (e) {
        console.warn('Failed to load from localStorage.', e);
        return null;
    }
}

/**
 * Persist current data to localStorage.
 * @param {object} data - The data to save ({ elements, connections, variables }).
 */
export function saveToLocalStorage(data) {
    try {
        const stateToSave = {
            elements: data.elements,
            connections: data.connections,
            variables: data.variables,
            // Keep legacy nodes key for backward compatibility
            nodes: data.elements
        };
        localStorage.setItem('workflowData', JSON.stringify(stateToSave));
    } catch (e) {
        console.warn('Failed to save to localStorage', e);
    }
}