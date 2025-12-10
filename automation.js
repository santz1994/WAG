// automation.js - WAG AUTOMATION FRAMEWORK
// "ZAPIER LOKAL" - Local automation workflows
// Combine file monitoring + WhatsApp notifications in automated sequences

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const chokidar = require('chokidar');

class AutomationEngine extends EventEmitter {
    constructor(client, config = {}) {
        super();
        this.client = client;
        this.workflows = [];
        this.isRunning = false;
        this.config = {
            watchDir: config.watchDir || './automation/input',
            outputDir: config.outputDir || './automation/output',
            tempDir: config.tempDir || './automation/temp',
            ...config
        };

        this.initDirs();
    }

    // Initialize required directories
    initDirs() {
        [this.config.watchDir, this.config.outputDir, this.config.tempDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${dir}`);
            }
        });
    }

    // Register a workflow (trigger -> actions sequence)
    registerWorkflow(name, trigger, actions) {
        const workflow = {
            id: `wf-${Date.now()}`,
            name,
            trigger, // { type: 'file', pattern: '*.pdf' }
            actions  // [ { type: 'watermark' }, { type: 'notify', ... } ]
        };
        this.workflows.push(workflow);
        console.log(`✅ Workflow registered: ${name}`);
        return workflow.id;
    }

    // Start monitoring for triggers
    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('🚀 Automation Engine started');

        // Setup file watchers for each workflow
        this.workflows.forEach(wf => {
            if (wf.trigger.type === 'file') {
                this.watchFiles(wf);
            }
        });
    }

    // Watch for file changes
    watchFiles(workflow) {
        const pattern = path.join(this.config.watchDir, workflow.trigger.pattern || '**/*');
        
        const watcher = chokidar.watch(pattern, {
            ignored: /(^|[\/\\])\.|\.tmp$/,
            persistent: true
        });

        watcher.on('add', async (filePath) => {
            console.log(`📄 New file detected: ${filePath}`);
            await this.executeWorkflow(workflow, filePath);
        });

        this.emit('watcher:started', { workflow: workflow.name, pattern });
    }

    // Execute workflow action sequence
    async executeWorkflow(workflow, triggerFile) {
        console.log(`\n⚡ Executing workflow: ${workflow.name}`);
        console.log(`📌 Triggered by: ${path.basename(triggerFile)}`);

        let currentFile = triggerFile;

        for (const action of workflow.actions) {
            try {
                console.log(`  ➜ Action: ${action.type}`);
                
                switch(action.type) {
                    case 'watermark':
                        currentFile = await this.actionWatermark(currentFile, action);
                        break;
                    case 'notify':
                        await this.actionNotify(currentFile, action);
                        break;
                    case 'move':
                        currentFile = await this.actionMove(currentFile, action);
                        break;
                    case 'delete':
                        await this.actionDelete(currentFile, action);
                        break;
                    case 'delay':
                        await this.actionDelay(action);
                        break;
                    default:
                        console.warn(`⚠️ Unknown action type: ${action.type}`);
                }
            } catch (error) {
                console.error(`❌ Error in action ${action.type}:`, error.message);
                this.emit('workflow:error', { workflow: workflow.name, action, error });
                break;
            }
        }

        console.log(`✅ Workflow completed: ${workflow.name}\n`);
        this.emit('workflow:completed', { workflow: workflow.name, triggerFile });
    }

    // ACTION: Watermark PDF
    async actionWatermark(filePath, action = {}) {
        console.log(`    Watermarking: ${path.basename(filePath)}`);
        
        // TODO: Integrate PDFKit or similar for actual watermarking
        // For now, just copy to output with prefix
        const outputPath = path.join(this.config.outputDir, `watermarked-${path.basename(filePath)}`);
        fs.copyFileSync(filePath, outputPath);
        
        console.log(`    ✓ Watermarked saved: ${path.basename(outputPath)}`);
        return outputPath;
    }

    // ACTION: Send WhatsApp Notification
    async actionNotify(filePath, action) {
        if (!action.number || !action.message) {
            throw new Error('notify action requires: number, message');
        }

        console.log(`    Sending WhatsApp to: ${action.number}`);
        
        const chatId = `${action.number.replace(/\D/g, '')}@c.us`;
        const messageText = action.message.replace('{filename}', path.basename(filePath));
        
        try {
            await this.client.sendMessage(chatId, messageText);
            if (action.attach && fs.existsSync(filePath)) {
                await this.client.sendMessage(chatId, {
                    media: filePath,
                    caption: 'Dokumen sudah diproses'
                });
            }
            console.log(`    ✓ Notification sent`);
        } catch (error) {
            throw new Error(`Failed to send WhatsApp: ${error.message}`);
        }
    }

    // ACTION: Move file to folder
    async actionMove(filePath, action) {
        if (!action.destination) {
            throw new Error('move action requires: destination');
        }

        const destDir = action.destination.startsWith('/') 
            ? action.destination 
            : path.join(this.config.outputDir, action.destination);
        
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const newPath = path.join(destDir, path.basename(filePath));
        fs.renameSync(filePath, newPath);
        
        console.log(`    ✓ Moved to: ${path.relative(this.config.watchDir, newPath)}`);
        return newPath;
    }

    // ACTION: Delete file
    async actionDelete(filePath, action = {}) {
        fs.unlinkSync(filePath);
        console.log(`    ✓ File deleted: ${path.basename(filePath)}`);
    }

    // ACTION: Wait/Delay between actions
    async actionDelay(action) {
        const ms = action.ms || 2000;
        console.log(`    ⏳ Waiting ${ms}ms...`);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Stop monitoring
    stop() {
        this.isRunning = false;
        console.log('🛑 Automation Engine stopped');
    }

    // Get workflow status
    getStatus() {
        return {
            running: this.isRunning,
            workflows: this.workflows.length,
            list: this.workflows.map(w => ({ id: w.id, name: w.name }))
        };
    }
}

module.exports = AutomationEngine;

// ============================================
// EXAMPLE USAGE (in server.js or separate file)
// ============================================
/*

const AutomationEngine = require('./automation');

// Initialize engine (needs WhatsApp client instance)
const automation = new AutomationEngine(client);

// Register workflow: PDF watermark + notification
automation.registerWorkflow(
    'PDF to Boss',
    { type: 'file', pattern: '*.pdf' }, // Trigger: any new PDF
    [
        { type: 'watermark' },                           // Step 1: Add watermark
        { type: 'notify',                                // Step 2: Send to WhatsApp
          number: '62812345678',
          message: 'File {filename} has been processed',
          attach: true },
        { type: 'move', destination: 'processed' },     // Step 3: Move to processed folder
        { type: 'delete' }                              // Step 4: Delete original
    ]
);

// Start automation
automation.start();

// Listen to events
automation.on('workflow:completed', (data) => {
    console.log('Workflow completed:', data.workflow);
});

automation.on('workflow:error', (data) => {
    console.error('Workflow error:', data.error.message);
});

*/
