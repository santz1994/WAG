// core/menu.js - CLI Main Menu & User Interface
// Interactive menu for WAG Local Cloud

const readline = require('readline');
const license = require('./license');

class CLIMenu {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    // Display main menu
    async showMainMenu() {
        console.clear();
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║       WAG LOCAL CLOUD - SWISS ARMY KNIFE SUITE         ║');
        console.log('║                  v1.2.0 - Modular                     ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('📋 MAIN MENU:\n');
        console.log('1. 💬 WhatsApp Gateway Server');
        console.log('2. 📸 Media Tools (Resize, Compress, Metadata)');
        console.log('3. 🌐 Network Tools (Monitor, Tunnels, Webhooks)');
        console.log('4. 🔐 Crypto Tools (Wallet, Gas Monitor, Explorer)');
        console.log('5. 🤖 Automation Engine');
        console.log('6. ⚙️  Settings & Configuration');
        console.log('7. 📖 Help & Documentation');
        console.log('0. 🚪 Exit\n');

        return this.prompt('Select option (0-7): ');
    }

    // WhatsApp menu
    async showWhatsAppMenu() {
        console.clear();
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║          💬 WHATSAPP GATEWAY MODULE                    ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('1. 🚀 Start API Server');
        console.log('2. 🔐 Enter License (Wallet)');
        console.log('3. 📬 Check Queue Status');
        console.log('4. 🔄 Send Test Message');
        console.log('0. ← Back to Main Menu\n');

        return this.prompt('Select option: ');
    }

    // Media tools menu
    async showMediaMenu() {
        console.clear();
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║           📸 MEDIA PROCESSING MODULE                   ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('1. 🖼️  Resize Images (Bulk)');
        console.log('2. 🗜️  Compress Images');
        console.log('3. 🔍 Remove Image Metadata (Privacy)');
        console.log('4. 🎬 Generate Video Thumbnails');
        console.log('5. 🎵 Extract Audio from Video');
        console.log('0. ← Back to Main Menu\n');

        return this.prompt('Select option: ');
    }

    // Network tools menu
    async showNetworkMenu() {
        console.clear();
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║         🌐 NETWORK & DEVELOPER TOOLS                   ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('1. 📡 Local Tunnel (Expose localhost to internet)');
        console.log('2. 🔒 SSL Certificate Monitor');
        console.log('3. 📊 Uptime Monitor');
        console.log('4. 🔌 Port Scanner');
        console.log('5. 🪝 Webhook Tester');
        console.log('6. 🔢 Base64 Converter');
        console.log('0. ← Back to Main Menu\n');

        return this.prompt('Select option: ');
    }

    // Crypto menu
    async showCryptoMenu() {
        console.clear();
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║           🔐 CRYPTOCURRENCY & WEB3 TOOLS               ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('1. 💰 Check Wallet Balance');
        console.log('2. ⛽ Gas Price Monitor (Polygon)');
        console.log('3. 👀 Wallet Activity Watcher');
        console.log('4. 📋 Paper Wallet Generator');
        console.log('5. 🔐 File Encrypter');
        console.log('0. ← Back to Main Menu\n');

        return this.prompt('Select option: ');
    }

    // Automation menu
    async showAutomationMenu() {
        console.clear();
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║          🤖 AUTOMATION ENGINE (ZAPIER LOKAL)           ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('1. ▶️  Start Automation Engine');
        console.log('2. ➕ Create New Workflow');
        console.log('3. 📋 List Active Workflows');
        console.log('4. ⏸️  Pause/Resume Workflow');
        console.log('0. ← Back to Main Menu\n');

        return this.prompt('Select option: ');
    }

    // License verification menu
    async verifyLicense() {
        console.log('\n🔐 LICENSE VERIFICATION\n');
        const wallet = await this.prompt('Enter your Polygon wallet address: ');

        if (!license.isValidWallet(wallet)) {
            console.log('\n❌ Invalid wallet address format');
            return null;
        }

        console.log('\n⏳ Checking license...\n');
        const licenseInfo = await license.checkLicense(wallet);

        if (licenseInfo.valid) {
            console.log('✅ License Valid!');
            console.log(`   Balance: ${licenseInfo.balance.toFixed(2)} WAG`);
            console.log(`   Status: LICENSED\n`);
            return wallet;
        } else {
            console.log('❌ License Invalid!');
            console.log(`   Reason: ${licenseInfo.reason}`);
            console.log(`   Required: ${licenseInfo.minRequired} tokens\n`);
            return null;
        }
    }

    // Check balance
    async checkBalance() {
        const wallet = await this.prompt('\nEnter wallet address: ');

        if (!license.isValidWallet(wallet)) {
            console.log('❌ Invalid wallet address');
            return;
        }

        try {
            console.log('⏳ Fetching balance...\n');
            const info = await license.getBalanceInfo(wallet);
            console.log(`💰 ${info.tokenName} (${info.tokenSymbol})`);
            console.log(`   Wallet: ${info.wallet}`);
            console.log(`   Balance: ${info.balance.toFixed(2)}`);
            console.log(`   Status: ${info.licensed ? '✅ Licensed' : '❌ Not Licensed'}\n`);
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    // Utility: Prompt user
    prompt(question) {
        return new Promise(resolve => {
            this.rl.question(question, resolve);
        });
    }

    // Close interface
    close() {
        this.rl.close();
    }
}

module.exports = CLIMenu;
