#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SETS_DIR = path.join(DATA_DIR, 'sets');

async function listSets() {
    try {
        const files = await fs.readdir(SETS_DIR);
        return files
            .filter(file => file.endsWith('.json'))
            .map(file => path.basename(file, '.json'))
            .sort();
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function loadJson(filePath, defaultValue = null) {
    try {
        const contents = await fs.readFile(filePath, 'utf8');
        return JSON.parse(contents);
    } catch (error) {
        if (error.code === 'ENOENT') {
            if (defaultValue !== null) return defaultValue;
            throw new Error(`File not found: ${filePath}`);
        }
        throw error;
    }
}

async function applyFilterSet(name) {
    const filePath = path.join(SETS_DIR, `${name}.json`);
    const filterSet = await loadJson(filePath);
    if (!filterSet || !Array.isArray(filterSet.filters)) {
        throw new Error(`Filter set ${name} is invalid or missing a filters array.`);
    }

    const elements = await loadJson(path.join(DATA_DIR, 'elements.json'), []);
    const connections = await loadJson(path.join(DATA_DIR, 'connections.json'), []);

    const normalizedLinks = connections.map(conn => ({
        id: conn.id || `${conn.fromId}->${conn.toId}`,
        source: conn.fromId,
        target: conn.toId,
        ...conn
    }));

    const filteringModule = await import(pathToFileURL(path.join(ROOT, 'src/js/filtering.js')));
    const { filterData } = filteringModule;

    const result = filterData(elements, normalizedLinks, filterSet.filters || [], 'exclude');
    const nodeIds = result.filteredNodes.map(node => node.id || node.Name || node.name).filter(Boolean);
    const linkIds = result.filteredLinks.map(link => link.id || `${link.source}->${link.target}`);

    return {
        filters: filterSet.filters,
        styling: filterSet.styling || [],
        nodeIds,
        linkIds,
        nodesCount: result.filteredNodes.length,
        linksCount: result.filteredLinks.length
    };
}

async function main() {
    const [, , arg] = process.argv;

    if (!arg || arg === '--list') {
        const sets = await listSets();
        if (!sets.length) {
            console.log('No filter sets found in data/sets.');
            return;
        }
        console.log('Available filter sets:');
        sets.forEach(name => console.log(`  - ${name}`));
        return;
    }

    const name = arg.trim();
    const sets = await listSets();
    if (!sets.includes(name)) {
        console.error(`Filter set "${name}" not found. Use --list to see available sets.`);
        process.exitCode = 1;
        return;
    }

    try {
        const { filters, styling, nodeIds, linkIds, nodesCount, linksCount } = await applyFilterSet(name);
        console.log(`Filter set "${name}" applied.`);
        console.log(`- Filters: ${filters.length}`);
        console.log(`- Styling rules: ${styling.length}`);
        console.log(`- Matching nodes (${nodesCount}): ${nodeIds.join(', ') || 'none'}`);
        console.log(`- Matching links (${linksCount}): ${linkIds.join(', ') || 'none'}`);
    } catch (error) {
        console.error(`Failed to apply filter set "${name}":`, error.message || error);
        process.exitCode = 1;
    }
}

main();
