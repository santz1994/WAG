// server.js - WAG NOTIFICATION GATEWAY API SERVER
// Jembatan antara Website Developer dan WhatsApp
// Syarat: Developer harus hold WAG Token
// Security: API Key + Persistent Queue + Random Rate Limiting

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { ethers } = require('ethers');
const cors = require('cors');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- KONFIGURASI ---
const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || "change-this-secret-key";
const QUEUE_FILE = path.join(__dirname, '.wag-queue.json');

const CONFIG = {
    TOKEN_ADDRESS: process.env.TOKEN_ADDRESS || "0x4e928F638cFD2F1c75437A41E2d386df79eeE680",
    MIN_HOLDING: parseInt(process.env.MIN_HOLDING) || 1000,
    RPC_URL: process.env.RPC_URL || "https://rpc-amoy.polygon.technology"
};

let isClientReady = false;
let messageQueue = []; // In-memory queue (persisted to disk)

// --- QUEUE PERSISTENCE FUNCTIONS ---
function loadQueueFromDisk() {
    try {
        if (fs.existsSync(QUEUE_FILE)) {
            const data = fs.readFileSync(QUEUE_FILE, 'utf-8');
            messageQueue = JSON.parse(data);
            console.log(`✅ Loaded ${messageQueue.length} queued messages from disk`);
            return messageQueue;
        }
    } catch (error) {
        console.error('⚠️ Error loading queue:', error.message);
    }
    return [];
}

function saveQueueToDisk() {
    try {
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(messageQueue, null, 2));
    } catch (error) {
        console.error('⚠️ Error saving queue:', error.message);
    }
}

// --- RANDOM DELAY HELPER ---
function getRandomDelay() {
    // Random delay between 1000ms and 4000ms to avoid bot detection
    return Math.floor(Math.random() * 3000) + 1000;
}

// --- 1. INISIALISASI WA CLIENT ---
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "wag-gateway-server"
    }),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

// --- API KEY AUTHENTICATION MIDDLEWARE ---
app.use((req, res, next) => {
    // Skip auth untuk health check
    if (req.path === '/health' || req.path === '/info') return next();
    
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_SECRET) {
        console.warn(`⚠️ Unauthorized access attempt from ${req.ip}`);
        return res.status(401).json({ 
            status: false, 
            message: 'Unauthorized: Invalid or missing API Key. Use header: x-api-key' 
        });
    }
    next();
});

client.on('qr', (qr) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 Scan QR Code ini dengan WhatsApp Anda:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    qrcode.generate(qr, { small: true });
    console.log('\n(QR Code berubah setiap 10-15 detik. Scan dengan cepat!)\n');
});

client.on('ready', () => {
    console.log('\n✅ WhatsApp Client SIAP!');
    console.log('🚀 WAG API Gateway berjalan...\n');
    isClientReady = true;
    
    // Load persisted queue dan process
    loadQueueFromDisk();
    if (messageQueue.length > 0) {
        console.log(`📬 Processing ${messageQueue.length} queued messages...`);
        processQueuedMessages();
    }
});

client.on('auth_failure', msg => {
    console.error('❌ Auth Gagal:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp Disconnected:', reason);
    isClientReady = false;
});

// --- QUEUE PROCESSOR ---
async function processQueuedMessages() {
    while (messageQueue.length > 0 && isClientReady) {
        const msg = messageQueue.shift();
        try {
            const chatId = formatWhatsAppNumber(msg.number);
            await client.sendMessage(chatId, msg.message);
            console.log(`✉️  Queued message sent to ${msg.number}`);
        } catch (error) {
            console.error(`❌ Failed to send queued message to ${msg.number}:`, error.message);
            messageQueue.unshift(msg); // Re-add to front if failed
            break;
        }
        // Use random delay to avoid bot detection
        await new Promise(r => setTimeout(r, getRandomDelay()));
    }
    saveQueueToDisk();
}

// --- 2. CEK LISENSI TOKEN (License Gate) ---
async function checkLicense(userWallet) {
    try {
        if (!ethers.isAddress(userWallet)) {
            return false;
        }

        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(CONFIG.TOKEN_ADDRESS, ABI, provider);
        
        const rawBalance = await contract.balanceOf(userWallet);
        const decimals = await contract.decimals();
        const balance = ethers.formatUnits(rawBalance, decimals);

        return parseFloat(balance) >= CONFIG.MIN_HOLDING;
    } catch (error) {
        console.error("❌ License Check Error:", error.message);
        return false;
    }
}

// --- 3. FORMAT NOMOR WHATSAPP ---
function formatWhatsAppNumber(number) {
    // Ubah 0812345678 menjadi 6281234567890
    let formatted = number.replace(/\D/g, ''); // Hapus karakter non-digit
    
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.slice(1);
    } else if (!formatted.startsWith('62')) {
        formatted = '62' + formatted;
    }
    
    return formatted + "@c.us";
}

// --- 4. HEALTH CHECK ENDPOINT ---
app.get('/health', (req, res) => {
    res.json({
        status: isClientReady ? 'ready' : 'initializing',
        timestamp: new Date().toISOString(),
        queued_messages: messageQueue.length
    });
});

// --- 5. SEND MESSAGE ENDPOINT (Main API) ---
app.post('/send-message', async (req, res) => {
    // A. Cek Status WA Client
    if (!isClientReady) {
        return res.status(503).json({ 
            status: false, 
            message: 'WhatsApp Client belum siap. Scan QR code terlebih dahulu.' 
        });
    }

    // B. Ambil Data dari Request
    const { number, message, wallet } = req.body;

    // C. Validasi Input
    if (!number || !message) {
        return res.status(400).json({ 
            status: false, 
            message: 'Parameter "number" dan "message" wajib ada' 
        });
    }

    if (!wallet) {
        return res.status(400).json({ 
            status: false, 
            message: 'Parameter "wallet" wajib ada untuk verifikasi lisensi' 
        });
    }

    // D. Cek License
    const hasLicense = await checkLicense(wallet);
    if (!hasLicense) {
        return res.status(403).json({ 
            status: false, 
            message: 'License Denied. Wallet tidak memiliki WAG token yang cukup.' 
        });
    }

    // E. Format Nomor
    const chatId = formatWhatsAppNumber(number);

    // F. Kirim Pesan
    try {
        await client.sendMessage(chatId, message);
        
        console.log(`✉️  Message sent to ${number}`);
        res.json({ 
            status: true, 
            message: 'Pesan terkirim sukses',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Send Error:', error.message);
        res.status(500).json({ 
            status: false, 
            message: `Gagal mengirim: ${error.message}` 
        });
    }
});

// --- 6. SEND BULK MESSAGES ENDPOINT ---
app.post('/send-bulk', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ 
            status: false, 
            message: 'WhatsApp Client belum siap' 
        });
    }

    const { messages, wallet } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ 
            status: false, 
            message: 'Parameter "messages" harus berupa array' 
        });
    }

    // Cek License
    const hasLicense = await checkLicense(wallet);
    if (!hasLicense) {
        return res.status(403).json({ 
            status: false, 
            message: 'License Denied' 
        });
    }

    // Kirim Bulk
    const results = [];
    for (const msg of messages) {
        try {
            const chatId = formatWhatsAppNumber(msg.number);
            await client.sendMessage(chatId, msg.message);
            
            results.push({
                number: msg.number,
                status: 'success'
            });
            
            // Random delay (1-4 seconds) antar pesan untuk menghindari rate limit dan bot detection
            await new Promise(r => setTimeout(r, getRandomDelay()));
        } catch (error) {
            results.push({
                number: msg.number,
                status: 'failed',
                error: error.message
            });
        }
    }

    saveQueueToDisk(); // Save queue state after bulk send
    res.json({
        status: true,
        total: messages.length,
        results: results
    });
});

// --- 7. CHECK LICENSE ENDPOINT ---
app.post('/check-license', async (req, res) => {
    const { wallet } = req.body;

    if (!wallet) {
        return res.status(400).json({ 
            status: false, 
            message: 'Parameter "wallet" wajib ada' 
        });
    }

    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(CONFIG.TOKEN_ADDRESS, ABI, provider);
        
        const rawBalance = await contract.balanceOf(wallet);
        const decimals = await contract.decimals();
        const balance = ethers.formatUnits(rawBalance, decimals);

        const hasLicense = parseFloat(balance) >= CONFIG.MIN_HOLDING;

        res.json({
            status: true,
            wallet: wallet,
            balance: balance,
            min_required: CONFIG.MIN_HOLDING,
            has_license: hasLicense
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// --- 8. INFO ENDPOINT ---
app.get('/info', (req, res) => {
    res.json({
        name: 'WAG API Gateway',
        version: '1.0.0',
        status: isClientReady ? 'ready' : 'initializing',
        endpoints: [
            'POST /send-message',
            'POST /send-bulk',
            'POST /check-license',
            'GET /health',
            'GET /info'
        ],
        config: {
            min_holding: CONFIG.MIN_HOLDING,
            rpc_url: CONFIG.RPC_URL,
            token_address: CONFIG.TOKEN_ADDRESS
        }
    });
});

// --- 9. ERROR HANDLING ---
app.use((err, req, res, next) => {
    console.error('Unexpected Error:', err);
    res.status(500).json({
        status: false,
        message: 'Internal Server Error'
    });
});

// --- 10. STARTUP SEQUENCE ---
async function startServer() {
    console.clear();
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║     WAG API GATEWAY - NOTIFICATION SERVER              ║');
    console.log('║     Token-Gated WhatsApp API for Developers            ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    let wallet;

    // Check if wallet provided as command-line argument
    if (process.argv.length > 2) {
        wallet = process.argv[2].trim();
        console.log(`📝 Wallet dari argument: ${wallet}\n`);
        await processWallet(wallet);
    } else {
        // Interactive mode
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('📝 Masukkan Wallet Polygon Anda untuk Verifikasi Lisensi: ', async (input) => {
            wallet = input.trim();
            rl.close();
            await processWallet(wallet);
        });
    }
}

async function processWallet(wallet) {
    if (!ethers.isAddress(wallet)) {
        console.log('\n❌ Alamat wallet tidak valid!');
        console.log(`Diterima: "${wallet}"`);
        process.exit(1);
    }

    console.log(`\n🔐 Checking License...\n`);
    const isValid = await checkLicense(wallet);

    if (isValid) {
        console.log('✅ Lisensi Valid! Menginisialisasi WhatsApp Client...\n');
        
        // Initialize WhatsApp Client
        client.initialize();

        // Start Express Server
        app.listen(PORT, () => {
            console.log(`\n✅ Server berjalan di http://localhost:${PORT}`);
            console.log(`📊 Test: curl -X GET http://localhost:${PORT}/health\n`);
        });
    } else {
        console.log('\n❌ Lisensi Tidak Valid!');
        console.log('Anda harus memiliki minimal 1000 WAG token untuk menggunakan gateway ini.');
        console.log('Beli token di QuickSwap: https://quickswap.exchange/\n');
        process.exit(1);
    }
}

// --- START ---
startServer();

// Handle Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});
