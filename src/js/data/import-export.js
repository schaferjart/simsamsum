/**
 * @module data/import-export
 * This module handles the serialization and deserialization of workflow data to and from JSON format.
 */

/**
 * Parses a JSON string to import structured data for the application.
 * It expects a JSON object with `nodes`, `connections`, and `variables` properties.
 * If parsing fails or the structure is incorrect, it returns a default empty structure.
 * @param {string} json - The JSON string to parse.
 * @returns {{nodes: Array<Object>, connections: Array<Object>, variables: Object}} The imported data structure.
 */
export function importFromJson(json) {
    try {
        const obj = JSON.parse(json);
        const nodes = Array.isArray(obj.nodes) ? obj.nodes : [];
        const connections = Array.isArray(obj.connections) ? obj.connections : [];
        const variables = (obj && typeof obj.variables === 'object' && obj.variables !== null) ? obj.variables : {};
        return { nodes, connections, variables };
    } catch (e) {
        console.error("Failed to import from JSON:", e);
        return { nodes: [], connections: [], variables: {} };
    }
}

/**
 * Converts a data object into a pretty-printed JSON string.
 * This is used for exporting the current state of the workflow.
 * @param {Object} data - The data object to serialize, expected to have `nodes`, `connections`, and `variables`.
 * @returns {string} A JSON string representing the data.
 */
export function exportToJson(data) {
    return JSON.stringify(data, null, 2);
}