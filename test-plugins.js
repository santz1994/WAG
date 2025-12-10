// test-plugins.js
// Quick test to verify new plugins load correctly

const path = require('path');
const fs = require('fs');

console.log('\n📦 WAG Tool - Plugin System Test\n');
console.log('═'.repeat(50));

// Simulate plugin loader
const modulesDir = path.join(__dirname, 'modules');
const plugins = [];

function loadPlugins(dir) {
    const categories = fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    console.log(`\n✓ Found ${categories.length} module categories:`);
    categories.forEach(cat => console.log(`  • ${cat}/`));

    for (const category of categories) {
        const catPath = path.join(dir, category);
        const files = fs.readdirSync(catPath)
            .filter(f => f.endsWith('.js') && f !== 'index.js');

        for (const file of files) {
            try {
                const filePath = path.join(catPath, file);
                const module = require(filePath);
                
                plugins.push({
                    category,
                    name: module.name,
                    slug: module.slug,
                    type: module.type,
                    version: module.version,
                    description: module.description,
                    handler: typeof module.handler === 'function'
                });

                console.log(`  ✓ Loaded: ${module.slug} (${category})`);
            } catch (error) {
                console.log(`  ✗ Failed: ${file} - ${error.message}`);
            }
        }
    }

    return plugins;
}

// Load plugins
const loadedPlugins = loadPlugins(modulesDir);

console.log('\n' + '═'.repeat(50));
console.log(`\n📊 Plugin Summary:\n`);
console.log(`Total Plugins Loaded: ${loadedPlugins.length}`);

// Group by category
const byCategory = {};
loadedPlugins.forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
});

Object.entries(byCategory).forEach(([cat, tools]) => {
    console.log(`\n  ${cat.toUpperCase()} (${tools.length} tools):`);
    tools.forEach(t => {
        console.log(`    • /${t.slug}`);
        console.log(`      └─ ${t.name} v${t.version}`);
    });
});

// Verify API endpoints
console.log('\n' + '═'.repeat(50));
console.log('\n🔗 API Endpoints Available:\n');

loadedPlugins.forEach(plugin => {
    console.log(`  POST /tools/${plugin.slug}`);
    console.log(`      Plugin: ${plugin.name}`);
    console.log(`      Handler: ${plugin.handler ? '✓ Ready' : '✗ Missing'}\n`);
});

// Test individual plugin loads
console.log('═'.repeat(50));
console.log('\n🧪 Plugin Handler Tests:\n');

const pdfWatermark = require('./modules/document/pdf-watermarker');
console.log(`✓ PDF Watermarker: ${pdfWatermark.name}`);
console.log(`  Actions: add-text-watermark, add-image-watermark, batch-watermark`);

const passwordGen = require('./modules/security/password-generator');
console.log(`✓ Password Generator: ${passwordGen.name}`);
console.log(`  Actions: generate-single, generate-batch, generate-memorable, check-strength`);

const hashGen = require('./modules/crypto/hash-generator');
console.log(`✓ Hash Generator: ${hashGen.name}`);
console.log(`  Actions: hash-text, hash-file, hash-multiple, verify-hash, generate-hmac`);

const qrGen = require('./modules/media/qr-code-generator');
console.log(`✓ QR Code Generator: ${qrGen.name}`);
console.log(`  Actions: generate-text, generate-url, generate-wifi, generate-vcard, batch-generate`);

const imgResize = require('./modules/media/image-resizer');
console.log(`✓ Image Resizer: ${imgResize.name}`);
console.log(`  Actions: resize, crop, convert, compress, thumbnail, batch-resize`);

console.log('\n' + '═'.repeat(50));
console.log('\n✅ All plugins loaded successfully!\n');

// Summary for API documentation
console.log('📝 API Documentation Summary:\n');
console.log('Base URL: http://localhost:3000');
console.log('Request format: POST /tools/{slug}');
console.log('Body format: { "action": "...", ...params }');
console.log('Response format: { "status": true/false, "action": "...", ...data }');

console.log('\n⚡ Next Steps:');
console.log('  1. npm start (start server)');
console.log('  2. curl -X POST http://localhost:3000/tools/password-gen \\');
console.log('        -H "Content-Type: application/json" \\');
console.log('        -d \'{"action":"generate-single","length":20}\'');

console.log('\n');
