// app.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { ethers } = require('ethers');
const readline = require('readline');
require('dotenv').config();

// --- KONFIGURASI TOKEN ANDA ---
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
const MIN_HOLDING = parseInt(process.env.MIN_HOLDING) || 1000;
const RPC_URL = process.env.RPC_URL || "https://polygon-rpc.com";

// ABI Singkat (Hanya fungsi cek saldo)
const ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.clear();
console.log("==========================================");
console.log("   WAG TOOL - TOKEN GATED SOFTWARE v1.0   ");
console.log("==========================================");
console.log("");

// FUNGSI 1: Cek Lisensi (Cek Saldo di Blockchain)
async function checkLicense(userWallet) {
    console.log("\n[1/3] Memeriksa Saldo Token WAG Anda...");
    
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(TOKEN_ADDRESS, ABI, provider);
        
        // Cek saldo
        const rawBalance = await contract.balanceOf(userWallet);
        const decimals = await contract.decimals();
        const balance = ethers.formatUnits(rawBalance, decimals);

        console.log(`Saldo WAG Anda: ${balance} Token`);

        if (parseFloat(balance) >= MIN_HOLDING) {
            console.log("✅ LISENSI VALID! Akses Diberikan.");
            return true;
        } else {
            console.log("❌ AKSES DITOLAK.");
            console.log(`Syarat: Hold minimal ${MIN_HOLDING} WAG.`);
            console.log("Silahkan beli token dulu di Uniswap/Quickswap.");
            return false;
        }
    } catch (error) {
        console.log("⚠️ Error koneksi blockchain:", error.message);
        console.log("Pastikan TOKEN_ADDRESS di .env file sudah benar.");
        return false;
    }
}

// FUNGSI 2: Menjalankan Bot WA
function startBot(userWallet) {
    console.log("\n[2/3] Menyiapkan WhatsApp Client...");
    console.log("(Ini mungkin butuh waktu 30-60 detik di pertama kali)\n");
    
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: "wag-tool-client"
        }),
        puppeteer: { 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: undefined
        }
    });

    client.on('qr', (qr) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[3/3] Scan QR Code ini dengan WhatsApp Anda:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        qrcode.generate(qr, { small: true });
        console.log('\n(QR Code akan berubah dalam 10-15 detik. Scan dengan cepat!)');
    });

    client.on('ready', () => {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ CLIENT WHATSAPP SIAP!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Wallet: ${userWallet}`);
        console.log('Status: Running');
        console.log('Jangan tutup jendela ini.\n');
        console.log('Command tersedia:');
        console.log('  - !ping        : Test bot (reply: pong)');
        console.log('  - !help        : Lihat bantuan');
        console.log('  - Ctrl+C       : Stop bot\n');
    });

    client.on('authenticated', () => {
        console.log('✅ Authenticated dengan WhatsApp');
    });

    // Contoh Fitur Sederhana
    client.on('message', msg => {
        if (msg.body === '!ping') {
            msg.reply('🏓 pong - WAG Tool Active');
        }
        if (msg.body === '!help') {
            msg.reply('WAG Tool Commands:\n!ping - Test bot\n!wallet - Show wallet info');
        }
        if (msg.body === '!wallet') {
            msg.reply(`💼 Wallet Anda: ${userWallet}`);
        }
    });

    client.on('disconnected', (reason) => {
        console.log('\n⚠️ WhatsApp disconnected:', reason);
        console.log('Closing application...');
        process.exit(0);
    });

    client.initialize();
}

// --- LOGIKA UTAMA (MAIN LOOP) ---
// Support command line argument: node app.js 0x...
const argWallet = process.argv[2];

if (argWallet) {
    // Direct execution dengan argument
    (async () => {
        const wallet = argWallet.trim();
        
        if (!ethers.isAddress(wallet)) {
            console.log("❌ Alamat wallet tidak valid!");
            console.log("Contoh format: 0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0");
            process.exit(1);
        }

        console.log(`\nWallet: ${wallet}`);
        
        const isAllowed = await checkLicense(wallet);

        if (isAllowed) {
            startBot(wallet);
        } else {
            console.log("\n❌ Akses ditolak. Menutup aplikasi dalam 5 detik...");
            setTimeout(() => process.exit(1), 5000);
        }
    })();
} else {
    // Interactive mode
    rl.question('Masukkan Alamat Wallet Polygon Anda (0x...): ', async (wallet) => {
        wallet = wallet.trim();
        
        if (!ethers.isAddress(wallet)) {
            console.log("❌ Alamat wallet tidak valid!");
            console.log("Contoh format: 0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0");
            process.exit(1);
        }

        console.log(`\nWallet: ${wallet}`);
        
        const isAllowed = await checkLicense(wallet);

        if (isAllowed) {
            startBot(wallet);
        } else {
            console.log("\n❌ Akses ditolak. Menutup aplikasi dalam 5 detik...");
            setTimeout(() => process.exit(1), 5000);
        }
        rl.close();
    });
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\nApplications terminated by user.');
    process.exit(0);
});
