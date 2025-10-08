/**
 * @module data
 * Barrel export for the data module.
 * This file re-exports all public APIs from the data sub-modules
 * to maintain compatibility with the original `data.js` module.
 */

export { sampleData } from './sample-data.js';
export { TOKEN_REGEX, extractExpressionTokens } from './expression-parser.js';
export { resolveValue } from './variable-resolver.js';
export { processData, computeDerivedFields } from './data-processor.js';
export { importFromJson, exportToJson } from './import-export.js';
export { verifyConnections } from './validators.js';