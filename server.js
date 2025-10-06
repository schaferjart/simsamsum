const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the project directory
app.use(express.static('.'));

/**
 * Save workflow data to JSON files
 * POST /api/save-workflow
 * Body: { elements: [], connections: [], variables: {} }
 */
app.post('/api/save-workflow', async (req, res) => {
    try {
        const { elements, connections, variables } = req.body;
        
    console.log('Saving workflow data:', {
            elements: elements?.length || 0,
            connections: connections?.length || 0,
            variables: Object.keys(variables || {}).length
        });

        // Ensure data directory exists
        const dataDir = path.join(__dirname, 'data');
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }

        // Save individual files
        const saves = [
            fs.writeFile(
                path.join(dataDir, 'elements.json'), 
                JSON.stringify(elements || [], null, 2)
            ),
            fs.writeFile(
                path.join(dataDir, 'connections.json'), 
                JSON.stringify(connections || [], null, 2)
            ),
            fs.writeFile(
                path.join(dataDir, 'variables.json'), 
                JSON.stringify(variables || {}, null, 2)
            )
        ];

        // Save combined file
        const combined = {
            elements: elements || [],
            connections: connections || [],
            variables: variables || {},
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        saves.push(fs.writeFile(
            path.join(dataDir, 'workflow.json'), 
            JSON.stringify(combined, null, 2)
        ));

        await Promise.all(saves);

        console.log('✅ Workflow data saved successfully');
        res.json({ 
            success: true, 
            message: 'Workflow data saved successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error saving workflow data:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Load workflow data from JSON files
 * GET /api/load-workflow
 */
app.get('/api/load-workflow', async (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'data');
        
        const [elements, connections, variables] = await Promise.allSettled([
            fs.readFile(path.join(dataDir, 'elements.json'), 'utf8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'connections.json'), 'utf8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'variables.json'), 'utf8').then(JSON.parse)
        ]);

        const result = {
            elements: elements.status === 'fulfilled' ? elements.value : [],
            connections: connections.status === 'fulfilled' ? connections.value : [],
            variables: variables.status === 'fulfilled' ? variables.value : {}
        };

        console.log('📂 Loaded workflow data:', {
            elements: result.elements.length,
            connections: result.connections.length,
            variables: Object.keys(result.variables).length
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Error loading workflow data:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Workflow API server is running'
    });
});

/**
 * Git metadata endpoint
 * GET /api/git-info
 * Returns current branch name and last commit details. If not a git repo, returns available=false.
 */
app.get('/api/git-info', (req, res) => {
    const safeExec = (cmd) => {
        try {
            return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        } catch {
            return null;
        }
    };

    // Quick check: are we inside a git repo?
    const isRepo = safeExec('git rev-parse --is-inside-work-tree') === 'true';
    if (!isRepo) {
        return res.json({ available: false });
    }

    const branch = safeExec('git rev-parse --abbrev-ref HEAD');
    const shortSha = safeExec('git rev-parse --short HEAD');
    const fullSha = safeExec('git rev-parse HEAD');
    const message = safeExec('git log -1 --pretty=%s');
    const author = safeExec('git log -1 --pretty=%an');
    const date = safeExec('git log -1 --pretty=%cI');
    const tag = safeExec('git describe --tags --exact-match HEAD 2>/dev/null') || safeExec('git describe --tags --abbrev=0 2>/dev/null');
    const repoUrlRaw = safeExec('git config --get remote.origin.url');

    // Normalize repo URL to https when possible
    let repoUrl = repoUrlRaw || null;
    if (repoUrl && repoUrl.startsWith('git@github.com:')) {
        repoUrl = 'https://github.com/' + repoUrl.replace('git@github.com:', '').replace(/\.git$/, '');
    } else if (repoUrl && repoUrl.startsWith('https://github.com/') && repoUrl.endsWith('.git')) {
        repoUrl = repoUrl.replace(/\.git$/, '');
    }

    res.json({
        available: true,
        branch,
        tag,
        commit: {
            shortSha,
            fullSha,
            message,
            author,
            date
        },
        repoUrl
    });
});

// --- Layout Endpoints ---

const layoutsDir = path.join(__dirname, 'data', 'layouts');
const filterSetsDir = path.join(__dirname, 'data', 'sets');

/**
 * Ensures the layouts directory exists.
 */
const ensureLayoutsDir = async () => {
    try {
        await fs.access(layoutsDir);
    } catch {
        console.log(`Creating layouts directory: ${layoutsDir}`);
        await fs.mkdir(layoutsDir, { recursive: true });
    }
};

const ensureFilterSetsDir = async () => {
    try {
        await fs.access(filterSetsDir);
    } catch {
    console.log(`Creating filter sets directory: ${filterSetsDir}`);
        await fs.mkdir(filterSetsDir, { recursive: true });
    }
};

/**
 * List available layouts
 * GET /api/layouts
 */
app.get('/api/layouts', async (req, res) => {
    await ensureLayoutsDir();
    try {
        const files = await fs.readdir(layoutsDir);
        const layouts = files
            .filter(file => path.extname(file) === '.json')
            .map(file => path.basename(file, '.json'));
        res.json(layouts);
    } catch (error) {
        console.error('❌ Error listing layouts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Load a specific layout
 * GET /api/layouts/:name
 */
app.get('/api/layouts/:name', async (req, res) => {
    await ensureLayoutsDir();
    const layoutName = req.params.name;
    // Basic sanitization to prevent directory traversal
    if (!layoutName || layoutName.includes('..') || layoutName.includes('/')) {
        return res.status(400).json({ success: false, error: 'Invalid layout name' });
    }
    const filePath = path.join(layoutsDir, `${layoutName}.json`);

    try {
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ success: false, error: 'Layout not found' });
        }
        console.error(`❌ Error loading layout "${layoutName}":`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Save a layout
 * POST /api/layouts/:name
 * Body: { positions: { nodeId: { x, y } } }
 */
app.post('/api/layouts/:name', async (req, res) => {
    await ensureLayoutsDir();
    const layoutName = req.params.name;
    if (!layoutName || layoutName.includes('..') || layoutName.includes('/')) {
        return res.status(400).json({ success: false, error: 'Invalid layout name' });
    }
    const filePath = path.join(layoutsDir, `${layoutName}.json`);

    try {
        const { positions } = req.body;
        if (!positions || typeof positions !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid positions data in request body' });
        }

    await fs.writeFile(filePath, JSON.stringify(positions, null, 2));
    console.log(`Layout "${layoutName}" saved successfully.`);
        res.json({ success: true, message: `Layout "${layoutName}" saved.` });

    } catch (error) {
        console.error(`❌ Error saving layout "${layoutName}":`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Filter Set Endpoints ---

const isValidFilterSetName = (value) => {
    return Boolean(value) && !value.includes('..') && !/[\\/]/.test(value);
};

app.get('/api/filter-sets', async (req, res) => {
    await ensureFilterSetsDir();
    try {
        const files = await fs.readdir(filterSetsDir);
        const filterSets = [];

        for (const file of files) {
            if (path.extname(file) !== '.json') continue;
            const name = path.basename(file, '.json');
            try {
                const contents = await fs.readFile(path.join(filterSetsDir, file), 'utf8');
                const parsed = JSON.parse(contents);
                filterSets.push({
                    name,
                    filters: Array.isArray(parsed.filters) ? parsed.filters : [],
                    styling: Array.isArray(parsed.styling) ? parsed.styling : [],
                    timestamp: parsed.timestamp || null
                });
            } catch (error) {
                console.error(`❌ Error reading filter set "${file}":`, error);
            }
        }

        res.json({ success: true, filterSets });
    } catch (error) {
        console.error('❌ Error listing filter sets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/filter-sets/:name', async (req, res) => {
    await ensureFilterSetsDir();
    const setName = req.params.name;
    if (!isValidFilterSetName(setName)) {
        return res.status(400).json({ success: false, error: 'Invalid filter set name' });
    }

    const filePath = path.join(filterSetsDir, `${setName}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data);
        res.json({
            success: true,
            filterSet: {
                name: setName,
                filters: Array.isArray(parsed.filters) ? parsed.filters : [],
                styling: Array.isArray(parsed.styling) ? parsed.styling : [],
                timestamp: parsed.timestamp || null
            }
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ success: false, error: 'Filter set not found' });
        }
        console.error(`❌ Error loading filter set "${setName}":`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/filter-sets/:name', async (req, res) => {
    await ensureFilterSetsDir();
    const setName = req.params.name;
    if (!isValidFilterSetName(setName)) {
        return res.status(400).json({ success: false, error: 'Invalid filter set name' });
    }

    const { filters, styling } = req.body || {};
    if (!Array.isArray(filters) || !Array.isArray(styling)) {
        return res.status(400).json({ success: false, error: 'Filters and styling must be arrays' });
    }

    const payload = {
        filters,
        styling,
        timestamp: new Date().toISOString()
    };

    try {
    await fs.writeFile(path.join(filterSetsDir, `${setName}.json`), JSON.stringify(payload, null, 2));
    console.log(`Filter set "${setName}" saved successfully.`);
        res.json({ success: true, filterSet: { name: setName, ...payload } });
    } catch (error) {
        console.error(`❌ Error saving filter set "${setName}":`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/filter-sets/:name', async (req, res) => {
    await ensureFilterSetsDir();
    const setName = req.params.name;
    if (!isValidFilterSetName(setName)) {
        return res.status(400).json({ success: false, error: 'Invalid filter set name' });
    }

    try {
    await fs.unlink(path.join(filterSetsDir, `${setName}.json`));
    console.log(`Filter set "${setName}" deleted.`);
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ success: false, error: 'Filter set not found' });
        }
        console.error(`❌ Error deleting filter set "${setName}":`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Start server
app.listen(PORT, async () => {
    // Ensure directories exist on startup
    await ensureLayoutsDir();
    await ensureFilterSetsDir();
    const dataDir = path.join(__dirname, 'data');
    try { await fs.access(dataDir); } catch { await fs.mkdir(dataDir); }

    console.log(`
Workflow API Server running on http://localhost:${PORT}
Serving files from: ${__dirname}
Data directory: ${path.join(__dirname, 'data')}
Layouts directory: ${layoutsDir}

Available endpoints:
  GET  /api/health          - Health check
  GET  /api/load-workflow   - Load main workflow data
  POST /api/save-workflow   - Save main workflow data
  GET  /api/layouts         - List all saved layouts
  GET  /api/layouts/:name   - Load a specific layout
  POST /api/layouts/:name   - Save a specific layout
    GET  /api/filter-sets     - List saved filter sets
    GET  /api/filter-sets/:name - Load a specific filter set
    POST /api/filter-sets/:name - Save a specific filter set
    DELETE /api/filter-sets/:name - Delete a specific filter set
    `);
});

module.exports = app;
