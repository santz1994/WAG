// modules/whatsapp/server.js - WhatsApp Gateway Module
// API server for sending WhatsApp notifications via token-gated license

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const license = require('../../core/license');

const MODULE_NAME = "WhatsApp Gateway";
const MODULE_SLUG = "whatsapp";

class WhatsAppModule {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.client = null;
        this.isReady = false;
        this.messageQueue = [];
        this.reconnectAttempts = 0;
        this.MAX_RECONNECT_ATTEMPTS = 5;
    }

    // Initialize WhatsApp client
    initializeClient() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "wag-gateway-server"
            }),
            puppeteer: { 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            }
        });

        this.setupClientEvents();
    }

    // Setup client event handlers
    setupClientEvents() {
        this.client.on('qr', (qr) => {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📱 Scan QR Code dengan WhatsApp Anda:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            qrcode.generate(qr, { small: true });
            console.log('\n(QR Code berubah setiap 10-15 detik. Scan dengan cepat!)\n');
        });

        this.client.on('ready', () => {
            console.log('\n✅ WhatsApp Client Ready!');
            this.isReady = true;
            this.reconnectAttempts = 0;
            this.processQueue();
        });

        this.client.on('auth_failure', (msg) => {
            console.error('❌ Auth Failed:', msg);
            process.exit(1);
        });

        this.client.on('disconnected', (reason) => {
            console.warn('⚠️ WhatsApp Disconnected:', reason);
            this.isReady = false;
            this.attemptReconnect();
        });
    }

    // Auto-reconnect logic
    attemptReconnect() {
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
            setTimeout(() => {
                this.client.initialize();
            }, 5000);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.reconnectAttempts = 0;
        }
    }

    // Setup API routes
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: this.isReady ? 'ready' : 'initializing',
                queue: this.messageQueue.length,
                reconnects: this.reconnectAttempts
            });
        });

        // Send message
        this.app.post('/send', async (req, res) => {
            const { number, message, wallet } = req.body;

            if (!number || !message || !wallet) {
                return res.status(400).json({ status: false, error: 'Missing parameters' });
            }

            const licenseCheck = await license.checkLicense(wallet);
            if (!licenseCheck.valid) {
                return res.status(403).json({ status: false, error: licenseCheck.reason });
            }

            if (!this.isReady) {
                return res.status(503).json({ status: false, error: 'WhatsApp not ready' });
            }

            try {
                const chatId = this.formatNumber(number);
                await this.client.sendMessage(chatId, message);
                res.json({ status: true, message: 'Sent successfully' });
            } catch (error) {
                res.status(500).json({ status: false, error: error.message });
            }
        });

        // Send bulk
        this.app.post('/send-bulk', async (req, res) => {
            const { messages, wallet } = req.body;

            const licenseCheck = await license.checkLicense(wallet);
            if (!licenseCheck.valid) {
                return res.status(403).json({ status: false, error: licenseCheck.reason });
            }

            const results = [];
            for (const msg of messages) {
                try {
                    const chatId = this.formatNumber(msg.number);
                    await this.client.sendMessage(chatId, msg.message);
                    results.push({ number: msg.number, status: 'success' });
                    await new Promise(r => setTimeout(r, 1000 + Math.random() * 3000));
                } catch (error) {
                    results.push({ number: msg.number, status: 'failed', error: error.message });
                }
            }
            res.json({ status: true, results });
        });
    }

    // Format phone number
    formatNumber(number) {
        let formatted = number.replace(/\D/g, '');
        if (formatted.startsWith('0')) {
            formatted = '62' + formatted.slice(1);
        } else if (!formatted.startsWith('62')) {
            formatted = '62' + formatted;
        }
        return formatted + "@c.us";
    }

    // Process queued messages
    async processQueue() {
        while (this.messageQueue.length > 0 && this.isReady) {
            const msg = this.messageQueue.shift();
            try {
                const chatId = this.formatNumber(msg.number);
                await this.client.sendMessage(chatId, msg.message);
                console.log(`✉️  Sent to ${msg.number}`);
            } catch (error) {
                console.error(`❌ Failed: ${error.message}`);
                this.messageQueue.unshift(msg);
                break;
            }
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 3000));
        }
    }

    // Start server
    async start(port = 3000, wallet) {
        // Verify license
        const licenseCheck = await license.checkLicense(wallet);
        if (!licenseCheck.valid) {
            console.error('❌ License Invalid:', licenseCheck.reason);
            process.exit(1);
        }

        console.log('✅ License Valid\n');

        this.initializeClient();
        this.setupRoutes();
        this.client.initialize();

        this.app.listen(port, () => {
            console.log(`\n🚀 WhatsApp Gateway running on port ${port}`);
            console.log(`📊 Test: curl http://localhost:${port}/health\n`);
        });
    }
}

module.exports = WhatsAppModule;
