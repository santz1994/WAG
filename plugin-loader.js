// plugin-loader.js - WAG PLUGIN SYSTEM
// Auto-loads and registers all tool modules
// Concept: Modular architecture for 100+ tools

const fs = require('fs');
const path = require('path');

class PluginLoader {
    constructor(app, automationEngine) {
        this.app = app;
        this.automationEngine = automationEngine;
        this.plugins = {};
        this.apiPlugins = [];
        this.actionPlugins = [];
    }

    // Load all plugins from modules directory
    loadAll() {
        const modulePath = path.join(__dirname, 'modules');
        
        if (!fs.existsSync(modulePath)) {
            console.warn('⚠️ Modules directory not found:', modulePath);
            return;
        }

        const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.js'));
        
        console.log(`\n📦 PLUGIN LOADER - Loading ${files.length} modules...\n`);

        files.forEach(file => {
            try {
                const modulePath = path.join(__dirname, 'modules', file);
                const pluginModule = require(modulePath);

                if (!pluginModule.name || !pluginModule.slug) {
                    console.warn(`⚠️ Skipped ${file}: Missing name or slug`);
                    return;
                }

                this.registerPlugin(pluginModule, file);
            } catch (error) {
                console.error(`❌ Error loading module ${file}:`, error.message);
            }
        });

        console.log(`\n✅ Plugin Loader Complete`);
        console.log(`   📡 API Endpoints: ${this.apiPlugins.length}`);
        console.log(`   ⚙️  Automation Actions: ${this.actionPlugins.length}\n`);
    }

    // Register a single plugin
    registerPlugin(plugin, filename) {
        const { name, slug, type, description, handler, version } = plugin;

        this.plugins[slug] = {
            name,
            slug,
            type,
            description,
            version: version || '1.0.0',
            file: filename
        };

        if (type === 'api' && handler) {
            // Register as REST API endpoint
            this.app.post(`/tools/${slug}`, async (req, res) => {
                try {
                    const result = await handler(req, res);
                    if (!res.headersSent) {
                        res.json(result || { status: true });
                    }
                } catch (error) {
                    if (!res.headersSent) {
                        res.status(500).json({
                            status: false,
                            error: error.message,
                            tool: slug
                        });
                    }
                }
            });

            this.apiPlugins.push(slug);
            console.log(`🛠️  [API]    ${name} → POST /tools/${slug}`);
        }

        if (type === 'action' && handler) {
            // Register as Automation action
            if (this.automationEngine) {
                this.automationEngine.registerCustomAction(slug, handler);
                this.actionPlugins.push(slug);
                console.log(`⚙️  [ACTION] ${name} → ${slug}`);
            }
        }

        if (type === 'webhook' && handler) {
            // Register as Webhook receiver
            this.app.post(`/webhooks/${slug}`, async (req, res) => {
                try {
                    await handler(req, res);
                    if (!res.headersSent) {
                        res.json({ status: true });
                    }
                } catch (error) {
                    if (!res.headersSent) {
                        res.status(500).json({ status: false, error: error.message });
                    }
                }
            });

            console.log(`🪝 [WEBHOOK] ${name} → POST /webhooks/${slug}`);
        }
    }

    // Get all registered plugins
    getPlugins() {
        return this.plugins;
    }

    // Get plugin info
    getPluginInfo(slug) {
        return this.plugins[slug] || null;
    }

    // List all plugins (for /info endpoint)
    listPlugins() {
        return {
            total: Object.keys(this.plugins).length,
            api: this.apiPlugins.length,
            actions: this.actionPlugins.length,
            plugins: Object.values(this.plugins).map(p => ({
                name: p.name,
                slug: p.slug,
                type: p.type,
                description: p.description,
                version: p.version,
                endpoint: p.type === 'api' ? `/tools/${p.slug}` : `[${p.type}]`
            }))
        };
    }
}

module.exports = PluginLoader;

// ============================================
// HOW TO USE IN server.js:
// ============================================
/*

const PluginLoader = require('./plugin-loader');
const pluginLoader = new PluginLoader(app, automationEngine);
pluginLoader.loadAll();

// Add to /info endpoint
app.get('/info', (req, res) => {
    res.json({
        name: 'WAG Local Cloud',
        plugins: pluginLoader.listPlugins(),
        ...otherInfo
    });
});

*/
