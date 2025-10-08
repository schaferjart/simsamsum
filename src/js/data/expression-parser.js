/**
 * @module data/expression-parser
 * This module contains functions for parsing expressions from strings.
 */

export const TOKEN_REGEX = /[A-Za-z_][\w]*(?:->[A-Za-z_][\w]*)*/g;

/**
 * Extracts all variable-like tokens from a string.
 * @param {string} expression - The expression string to parse.
 * @returns {string[]} An array of unique tokens found in the expression.
 */
export function extractExpressionTokens(expression) {
    if (typeof expression !== 'string') {
        return [];
    }
    const matches = expression.match(TOKEN_REGEX);
    return matches ? Array.from(new Set(matches)) : [];
}