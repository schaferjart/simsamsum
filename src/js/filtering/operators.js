/**
 * @module filtering/operators
 * This module defines the set of operators used for evaluating filter and styling rules.
 */

/**
 * Converts a value to a numeric type for comparison.
 * @param {*} value - The value to convert.
 * @returns {number|null} The numeric value, or null if conversion is not possible.
 * @private
 */
function toNumeric(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const str = String(value).trim();
    if (str === '') return null;
    const normalized = str.replace(/,/g, '');
    const num = Number(normalized);
    return Number.isNaN(num) ? null : num;
}

/**
 * A collection of operator functions used for rule evaluation.
 * Each operator takes the item's value and the rule's value and returns a boolean.
 */
export const OPERATORS = {
    contains: (itemValue, ruleValue) => String(itemValue).toLowerCase().includes(String(ruleValue).toLowerCase()),
    not_contains: (itemValue, ruleValue) => !String(itemValue).toLowerCase().includes(String(ruleValue).toLowerCase()),
    equals: (itemValue, ruleValue) => String(itemValue).toLowerCase() === String(ruleValue).toLowerCase(),
    not_equals: (itemValue, ruleValue) => String(itemValue).toLowerCase() !== String(ruleValue).toLowerCase(),
    gt: (itemValue, ruleValue) => {
        const itemNum = toNumeric(itemValue);
        const ruleNum = toNumeric(ruleValue);
        return itemNum !== null && ruleNum !== null && itemNum > ruleNum;
    },
    lt: (itemValue, ruleValue) => {
        const itemNum = toNumeric(itemValue);
        const ruleNum = toNumeric(ruleValue);
        return itemNum !== null && ruleNum !== null && itemNum < ruleNum;
    },
    eq: (itemValue, ruleValue) => {
        const itemNum = toNumeric(itemValue);
        const ruleNum = toNumeric(ruleValue);
        return itemNum !== null && ruleNum !== null && itemNum === ruleNum;
    },
    between: (itemValue, ruleValue) => {
        if (!ruleValue || typeof ruleValue !== 'object') return false;
        const min = toNumeric(ruleValue.min ?? ruleValue.from ?? ruleValue.start ?? ruleValue.lower ?? null);
        const max = toNumeric(ruleValue.max ?? ruleValue.to ?? ruleValue.end ?? ruleValue.upper ?? null);
        const itemNum = toNumeric(itemValue);
        if (itemNum === null) return false;
        if (min !== null && itemNum < min) return false;
        if (max !== null && itemNum > max) return false;
        return true;
    },
    is_empty: (itemValue) => {
        return itemValue === null || itemValue === undefined || String(itemValue).trim() === '';
    },
    is_not_empty: (itemValue) => {
        return itemValue !== null && itemValue !== undefined && String(itemValue).trim() !== '';
    },
    starts_with: (itemValue, ruleValue) => {
        return String(itemValue).toLowerCase().startsWith(String(ruleValue).toLowerCase());
    },
    ends_with: (itemValue, ruleValue) => {
        return String(itemValue).toLowerCase().endsWith(String(ruleValue).toLowerCase());
    }
};