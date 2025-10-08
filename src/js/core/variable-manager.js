/**
 * @module core/variable-manager
 * Manages generated variables, their resolution, and tracking of usage.
 */

import { extractExpressionTokens } from '../data/index.js';

/**
 * Variable Manager
 * Handles generated variables from connections and their resolution for expressions.
 */
export class VariableManager {
    constructor() {
        this.generatedVariables = {};
        this.usedGeneratedVariables = new Set();
    }

    /**
     * Refreshes generated variables from connections.
     * @param {Array<object>} connections - Array of connection objects
     * @param {object} variables - User-defined variables object
     */
    refreshGeneratedVariables(connections, variables) {
        const generated = {};

        (connections || []).forEach((conn) => {
            const id = typeof conn.id === 'string' && conn.id.trim()
                ? conn.id.trim()
                : (conn.fromId && conn.toId ? `${conn.fromId}->${conn.toId}` : '');
            if (!id) {
                return;
            }

            const probabilityRaw = conn.probability !== undefined && conn.probability !== null
                ? conn.probability
                : '';

            // Only create variable entries for:
            // 1. Explicit non-default numeric values (0.8, 0.5, etc - NOT 1)
            // Skip: default 1, empty strings, expressions, variable references

            if (typeof probabilityRaw === 'number') {
                // Only store if not default value 1
                if (probabilityRaw !== 1) {
                    generated[id] = probabilityRaw;
                }
            } else if (typeof probabilityRaw === 'string' && probabilityRaw.trim() !== '') {
                const trimmed = probabilityRaw.trim();

                // Check if it's a numeric string (like ".8" or "0.5")
                if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
                    const numValue = Number(trimmed);
                    // Only store if not default value 1
                    if (numValue !== 1) {
                        generated[id] = numValue;
                    }
                }
                // Don't store variable references (like "pick_up_rate") or expressions
                // They're not variables themselves, just references to existing variables
            }
            // Empty strings and default 1 are skipped entirely
        });

        this.generatedVariables = generated;
        this.syncGeneratedVariableUsage(connections, variables);
    }

    /**
     * Syncs which generated variables are actually used in expressions.
     * @param {Array<object>} connections - Array of connection objects
     * @param {object} variables - User-defined variables object
     * @param {Array<object>} elements - Array of element objects
     */
    syncGeneratedVariableUsage(connections, variables, elements = []) {
        const referenced = new Set();
        const collectFromValue = (value) => {
            if (typeof value !== 'string') {
                return;
            }
            extractExpressionTokens(value).forEach(token => {
                if (this.generatedVariables && Object.prototype.hasOwnProperty.call(this.generatedVariables, token)) {
                    referenced.add(token);
                }
            });
        };

        (elements || []).forEach((element) => {
            collectFromValue(element.incomingNumber);
            collectFromValue(element.avgCost);
            collectFromValue(element.variable);
            collectFromValue(element.nodeMultiplier);
        });

        Object.values(variables || {}).forEach(collectFromValue);

        this.usedGeneratedVariables = referenced;
    }

    /**
     * Gets combined variables for expression evaluation.
     * @param {object} userVariables - User-defined variables
     * @returns {object} Combined variables object
     */
    getEvaluationVariables(userVariables) {
        return {
            ...this.generatedVariables,
            ...userVariables
        };
    }

    /**
     * Resolves variables in a value string.
     * @param {string} value - The value to resolve
     * @param {object} userVariables - User-defined variables
     * @param {Function} resolveValueFn - The resolve function from data module
     * @returns {*} Resolved value
     */
    resolveVariables(value, userVariables, resolveValueFn) {
        const combinedVars = this.getEvaluationVariables(userVariables);
        return resolveValueFn(value, combinedVars);
    }

    /**
     * Gets all generated variables.
     * @returns {object} Generated variables object
     */
    getGeneratedVariables() {
        return { ...this.generatedVariables };
    }

    /**
     * Gets all used generated variables.
     * @returns {Set<string>} Set of used variable names
     */
    getUsedVariables() {
        return new Set(this.usedGeneratedVariables);
    }

    /**
     * Checks if a generated variable is used.
     * @param {string} varName - Variable name to check
     * @returns {boolean} True if variable is used
     */
    isVariableUsed(varName) {
        return this.usedGeneratedVariables.has(varName);
    }

    /**
     * Gets the value of a generated variable.
     * @param {string} varName - Variable name
     * @returns {*} Variable value or undefined
     */
    getVariableValue(varName) {
        return this.generatedVariables[varName];
    }

    /**
     * Clears all generated variables and usage tracking.
     */
    clear() {
        this.generatedVariables = {};
        this.usedGeneratedVariables.clear();
    }
}
