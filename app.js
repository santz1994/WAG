#!/usr/bin/env node

// app.js - WAG LOCAL CLOUD MAIN ENTRY POINT
// Modular architecture: WhatsApp + Media + Network + Crypto + Automation

const CLIMenu = require('./core/menu');
const WhatsAppModule = require('./modules/whatsapp/server');

async function main() {
    const menu = new CLIMenu();
    let running = true;

    while (running) {
        const choice = await menu.showMainMenu();

        switch (choice) {
            case '1':
                await handleWhatsApp(menu);
                break;
            case '2':
                await menu.showMediaMenu();
                console.log('\n⏳ Media tools are loading...\n');
                await menu.prompt('Press Enter to continue...');
                break;
            case '3':
                await menu.showNetworkMenu();
                console.log('\n⏳ Network tools are loading...\n');
                await menu.prompt('Press Enter to continue...');
                break;
            case '4':
                await menu.showCryptoMenu();
                console.log('\n⏳ Crypto tools are loading...\n');
                await menu.prompt('Press Enter to continue...');
                break;
            case '5':
                console.log('\n⏳ Automation engine is loading...\n');
                await menu.prompt('Press Enter to continue...');
                break;
            case '6':
                console.log('\n⚙️  Settings would go here\n');
                await menu.prompt('Press Enter to continue...');
                break;
            case '7':
                showHelp();
                await menu.prompt('Press Enter to continue...');
                break;
            case '0':
                console.log('\n👋 Goodbye!\n');
                running = false;
                break;
            default:
                console.log('\n❌ Invalid option\n');
                await menu.prompt('Press Enter to continue...');
        }
    }

    menu.close();
}

async function handleWhatsApp(menu) {
    let whatsappRunning = true;

    while (whatsappRunning) {
        const choice = await menu.showWhatsAppMenu();

        switch (choice) {
            case '1':
                await startWhatsAppServer(menu);
                whatsappRunning = false;
                break;
            case '2':
                const wallet = await menu.verifyLicense();
                if (wallet) {
                    console.log(`\n✅ Wallet set to: ${wallet.substring(0, 10)}...\n`);
                    await menu.prompt('Press Enter to continue...');
                } else {
                    await menu.prompt('Press Enter to continue...');
                }
                break;
            case '3':
                console.log('\n📬 Queue status would display here\n');
                await menu.prompt('Press Enter to continue...');
                break;
            case '4':
                console.log('\n📨 Test message would be sent here\n');
                await menu.prompt('Press Enter to continue...');
                break;
            case '0':
                whatsappRunning = false;
                break;
            default:
                console.log('\n❌ Invalid option\n');
                await menu.prompt('Press Enter to continue...');
        }
    }
}

async function startWhatsAppServer(menu) {
    const wallet = await menu.verifyLicense();
    if (!wallet) {
        console.log('\n❌ Cannot start without valid license\n');
        await menu.prompt('Press Enter to continue...');
        return;
    }

    const portInput = await menu.prompt('\nEnter port (default 3000): ');
    const port = portInput ? parseInt(portInput) : 3000;

    const whatsapp = new WhatsAppModule();
    console.log('\n🚀 Starting WhatsApp Gateway Server...\n');

    try {
        await whatsapp.start(port, wallet);
        console.log('ℹ️  Press Ctrl+C to stop the server');
        await new Promise(() => {}); // Keep running
    } catch (error) {
        console.error('\n❌ Error starting server:', error.message);
        await menu.prompt('Press Enter to continue...');
    }
}

function showHelp() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           📖 WAG LOCAL CLOUD - HELP & DOCS            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('🎯 QUICK START:\n');
    console.log('1. WhatsApp Gateway: Requires Polygon wallet with WAG tokens');
    console.log('2. Media Tools: Resize, compress, optimize images & videos');
    console.log('3. Network Tools: Monitor, tunnel, and test APIs');
    console.log('4. Crypto Tools: Wallet & blockchain utilities');
    console.log('5. Automation: Create workflows (Zapier-like)\n');

    console.log('📚 DOCUMENTATION:\n');
    console.log('  GitHub: https://github.com/santz1994/WAG');
    console.log('  Docs: /docs folder in project\n');

    console.log('💡 FEATURES:\n');
    console.log('  ✅ All-in-one local cloud platform');
    console.log('  ✅ No external API dependencies (privacy focused)');
    console.log('  ✅ Modular: Add/remove tools as needed');
    console.log('  ✅ Token-gated: License via blockchain\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    process.exit(0);
});

// Run main
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
