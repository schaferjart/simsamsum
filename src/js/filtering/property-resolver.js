/**
 * @module filtering/property-resolver
 * This module provides utility functions for safely resolving nested properties from objects.
 */

/**
 * A helper function to safely get a nested property from an object using a dot-notation path.
 * It first attempts an exact case-sensitive match. If that fails, it tries a case-insensitive search.
 * @param {object} obj - The object to query.
 * @param {string} path - The path to the property (e.g., 'source.name' or 'Type').
 * @returns {*} The value of the property, or undefined if not found.
 */
export function getProperty(obj, path) {
    // Try exact match first for performance
    const exactValue = path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
    if (exactValue !== undefined) {
        return exactValue;
    }

    // If exact match fails, try a case-insensitive search
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }

        // Try exact match at this level
        if (current[part] !== undefined) {
            current = current[part];
            continue;
        }

        // Fallback to case-insensitive match
        const lowerPart = part.toLowerCase();
        const key = Object.keys(current).find(k => k.toLowerCase() === lowerPart);
        if (key !== undefined) {
            current = current[key];
        } else {
            return undefined;
        }
    }
    return current;
}