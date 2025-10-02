/**
 * A library of predefined SVG shapes that can be used for nodes.
 * Each key is a shape name, and the value is the SVG string for its path data (`d` attribute).
 * These paths are designed to be drawn within a 24x24 viewbox.
 */
export const SHAPE_LIBRARY = {
    'circle': 'M12,2A10,10,0,1,1,2,12,10,10,0,0,1,12,2Z',
    'square': 'M3,3H21V21H3Z',
    'triangle': 'M12,2L2,22H22Z',
    'diamond': 'M12,2L22,12L12,22L2,12Z',
    'star': 'M12,1.25L14.63,7.4L21,8.36L16.5,12.74L17.75,19L12,15.75L6.25,19L7.5,12.74L3,8.36L9.37,7.4L12,1.25Z',
    'hexagon': 'M19.5,6L16,3H8L4.5,6L4.5,18L8,21H16L19.5,18Z',
    'plus': 'M19,11H13V5a1,1,0,0,0-2,0v6H5a1,1,0,0,0,0,2h6v6a1,1,0,0,0,2,0V13h6a1,1,0,0,0,0-2Z',
};

/**
 * Generates the SVG <defs> block containing all the shape symbols.
 * This should be appended to the main SVG element once on initialization.
 */
export function generateShapeDefs() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    for (const [name, pathData] of Object.entries(SHAPE_LIBRARY)) {
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
        symbol.id = `shape-${name}`;
        symbol.setAttribute('viewBox', '0 0 24 24');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);

        symbol.appendChild(path);
        defs.appendChild(symbol);
    }
    return defs;
}