/**
 * @module data/variable-resolver
 * This module handles resolving variables and evaluating expressions within a given context.
 */

import { TOKEN_REGEX } from './expression-parser.js';

const NUMERIC_LITERAL_REGEX = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const VARIABLE_TOKEN_REGEX = /^\s*(?:\$?\{)?([a-zA-Z_][\w]*)\}?\s*$/;
const EXPRESSION_ALLOWED_CHARS = /^[0-9+\-*/()._\sA-Za-z>${}$\{\}]+$/;

/**
 * Recursively resolves a token to a numeric value.
 * @param {string} token - The token to resolve.
 * @param {Record<string, number|string>} variables - The context of available variables.
 * @param {Set<string>} stack - The set of tokens currently in the resolution stack to detect cycles.
 * @returns {number} The resolved numeric value.
 */
function resolveToken(token, variables = {}, stack = new Set()) {
    if (!token) {
        return 0;
    }

    if (stack.has(token)) {
        console.warn(`Circular variable reference detected for token "${token}"`);
        return 0;
    }

    stack.add(token);
    const raw = variables?.[token];
    if (raw === undefined || raw === null || raw === '') {
        stack.delete(token);
        return 0;
    }

    const resolved = resolveValueInternal(raw, variables, stack);
    stack.delete(token);
    return Number.isFinite(resolved) ? resolved : 0;
}

/**
 * Evaluates a mathematical expression string with variable substitution.
 * @param {string} expression - The expression to evaluate.
 * @param {Record<string, number|string>} variables - The context of available variables.
 * @param {Set<string>} stack - The resolution stack.
 * @returns {number|null} The result of the expression, or null if invalid.
 */
function evaluateExpression(expression, variables = {}, stack = new Set()) {
    if (typeof expression !== 'string') {
        return null;
    }

    const trimmed = expression.trim();
    if (!trimmed) {
        return null;
    }

    if (!EXPRESSION_ALLOWED_CHARS.test(trimmed)) {
        return null;
    }

    const replaced = trimmed.replace(TOKEN_REGEX, (match) => {
        const value = resolveToken(match, variables, stack);
        return String(Number.isFinite(value) ? value : 0);
    });

    try {
        const result = Function('"use strict"; return (' + replaced + ');')();
        return Number.isFinite(result) ? result : null;
    } catch (_) {
        return null;
    }
}

/**
 * Internal implementation for resolving a value.
 * @param {string|number} value - The value to resolve.
 * @param {Record<string, number|string>} variables - The context of available variables.
 * @param {Set<string>} stack - The resolution stack.
 * @returns {number} The resolved numeric value.
 */
function resolveValueInternal(value, variables = {}, stack = new Set()) {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return 0;
        }

        if (NUMERIC_LITERAL_REGEX.test(trimmed)) {
            return Number(trimmed);
        }

        const directMatch = trimmed.match(VARIABLE_TOKEN_REGEX);
        if (directMatch) {
            const key = directMatch[1];
            return resolveToken(key, variables, stack);
        }

        const evaluated = evaluateExpression(trimmed, variables, stack);
        if (evaluated !== null) {
            return evaluated;
        }

        return 0;
    }

    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
}

/**
 * Resolves a numeric value that may be a direct number, a string number, or a variable reference.
 * This is the main public entry point for value resolution.
 * @param {string|number} value - The value to resolve.
 * @param {Record<string, number|string>} variables - The context of available variables.
 * @returns {number} The resolved numeric value.
 */
export function resolveValue(value, variables = {}) {
    return resolveValueInternal(value, variables, new Set());
}