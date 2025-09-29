const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

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
        
        console.log('💾 Saving workflow data:', {
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

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Workflow API Server running on http://localhost:${PORT}
📁 Serving files from: ${__dirname}
💾 Data directory: ${path.join(__dirname, 'data')}

Available endpoints:
  GET  /api/health - Health check
  GET  /api/load-workflow - Load workflow data
  POST /api/save-workflow - Save workflow data
    `);
});

module.exports = app;
