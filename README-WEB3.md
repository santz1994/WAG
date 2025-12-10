# WAG Tool - Web3 Token-Gated Crypto Platform

> **Version: 3.0.0 Web3 Edition** | **Status:** ✅ **PRODUCTION READY** | **Model:** Pure Token-Gating
>
> **🪙 $WAG Token = Ownership | 🔗 Blockchain = Database | ⛓️ Polygon Network**

## 🎯 What is WAG Tool?

WAG Tool is a **pure Web3 platform** with 50 production-ready crypto & utility tools. Access is determined entirely by how many **$WAG tokens** you hold in your wallet on Polygon network.

**No subscriptions. No databases. No lock-in. Pure blockchain ownership.**

- 🪙 **Hold $WAG** → Get Access to Tools
- 🔗 **Use Web3 Portal** → Connect wallet, download client
- ⚙️ **Run Desktop App** → All 50 tools offline-capable
- 🚀 **Deploy API** → Self-hosted server for developers

### Why Web3 Instead of SaaS?

| Aspect | Traditional SaaS | WAG Tool Web3 |
|--------|------------------|---------------|
| **Payment** | Monthly recurring | One-time token purchase |
| **Access Control** | Company database | Blockchain (immutable) |
| **User Data** | Email, password stored | Wallet address only |
| **Ownership** | You rent access | You own $WAG tokens |
| **Cancellation** | Unsubscribe process | Just sell tokens |
| **Privacy** | Data collected | Minimal data collection |
| **Censorship** | Can be kicked out | Only blockchain can limit |

---

## 🏆 Token Tier Structure

Your access is **automatically determined** by your $WAG balance. No manual upgrades needed.

### 🌐 Visitor (0 - 999 $WAG)
```
✅ View tool documentation
✅ See tier comparison
❌ Execute tools (view-only)

Next: Buy 1,000 $WAG (~$30-100) on Uniswap
```

### 💎 Holder (1,000 - 9,999 $WAG)
```
✅ Access to 13 basic tools
✅ 1,000 requests/day
✅ 1 API key

Tools: Unit Converter, Wallet Generator, Gas Monitor, QR Code, 
       Text-to-Speech, JSON Formatter, Regex Tester, + 6 more
```

### 🐋 Whale (10,000+ $WAG)
```
✅ Access to ALL 50 tools
✅ 10,000 requests/day
✅ 10 API keys

Tools: All Holder tools + Premium tools (WhatsApp Gateway, 
       Vanity Miner, Private Key Encrypter, + 32 more)
```

---

## 🚀 Quick Start (5 Minutes)

### 1. Open Web3 Portal
Open `web3-portal.html` (or access via hosted link)

### 2. Connect Wallet
- Click **"Connect Wallet"**
- MetaMask popup appears
- Portal reads your $WAG balance from Polygon

### 3. Check Your Tier
- Shows: Wallet address, $WAG balance, tier
- Shows: Available tools, tokens to next tier

### 4. Download & Use
- **Visitor**: Click "Buy $WAG on Uniswap"
- **Holder/Whale**: Download `WAG-Client.exe` or use API

### 5. Run Desktop Client
```bash
# Download from portal
# Extract & run WAG-Client.exe
# Enter wallet address when prompted
# Menu shows available tools
# Select tool and execute
```

---

## 💻 Installation Options

### Option 1: Desktop Client (Easiest)
```
1. Download WAG-Client.exe from web3-portal.html
2. Run the file (Windows only)
3. Enter your wallet address
4. Use menu to run tools
```

### Option 2: Web3 Portal (Browser)
```
1. Open web3-portal.html
2. Connect MetaMask
3. Generate API key
4. Make REST API calls
```

### Option 3: Self-Hosted Server
```bash
npm install
npm start
# Runs on localhost:3000
# Auto-verifies tier on each request
```

---

## 🔑 Using the API

Generate API key from Web3 Portal, then:

```bash
# Check tier
curl -X POST http://localhost:3000/api/tier/check-access \
  -H "Authorization: Bearer wag_YOUR_KEY" \
  -d '{"wallet": "0x...", "tool": "text-to-speech"}'

# Run a tool
curl -X POST http://localhost:3000/tools/text-to-speech \
  -H "Authorization: Bearer wag_YOUR_KEY" \
  -d '{"wallet": "0x...", "text": "Hello"}'
```

---

## 🌐 How It Works

```
User connects wallet
         ↓
Reads token balance from Polygon blockchain (read-only)
         ↓
Determines tier automatically (0=Visitor, 1000=Holder, 10000=Whale)
         ↓
Shows allowed tools based on tier
         ↓
User executes tool (if access granted)
         ↓
System records execution (optional, for analytics)
```

**Key benefit**: No central database storing user info. Blockchain is source of truth.

---

## 💰 Buying $WAG Tokens

### On Uniswap (Easy)
1. Go to https://app.uniswap.org/swap
2. Connect wallet
3. Swap USDT (or other) → $WAG on Polygon
4. Confirm transaction
5. Refresh WAG Tool portal
6. Your tier updates instantly

### Token Details
- **Network**: Polygon (Layer 2)
- **Type**: ERC20 standard
- **Decimals**: 18
- **Where**: Uniswap, QuickSwap (DEXs)

---

## 📊 All 50 Tools Breakdown

### 🔤 Text Tools (10)
text-to-speech, greeting-card, pdf-merge, json-formatter, regex-tester, base64-encoder, xml-converter, markdown-converter, html-compressor, yaml-parser

### 🔐 Crypto Tools (12)
wallet-generator, address-converter, key-encrypter, vanity-miner, gas-monitor, price-checker, ens-resolver, contract-decoder, hash-generator, signature-verifier, seed-validator, tx-simulator

### 💾 System Tools (8)
system-monitor, process-manager, file-handler, network-tester, port-scanner, disk-analyzer, memory-profiler, check-license

### 📊 Office Tools (7)
excel-converter, pdf-generator, csv-importer, spreadsheet-calculator, chart-creator, report-builder, document-merger

### 🎨 Media Tools (10)
image-resizer, image-converter, video-converter, audio-processor, qr-code-generator, barcode-generator, color-extractor, svg-optimizer, gif-maker, screenshot-tool

### 🛠️ Utility (3)
unit-converter, uuid-generator, password-generator

---

## 🏗️ Architecture

### Three Deployment Paths

**Web3 Portal (DApp)**
- File: `web3-portal.html`
- Host: IPFS or Vercel
- Cost: $0 (IPFS) or $5/month (Vercel)

**Desktop Client (EXE)**
- File: `WAG-Client.exe` (bundled)
- Built with: npm pkg
- Cost: $0, free download

**Cloud API (Optional)**
- File: `server.js`
- Host: Your VPS/AWS/Railway
- Cost: Your hosting costs

---

## 📚 Documentation

- **[docs/WEB3_ARCHITECTURE.md](docs/WEB3_ARCHITECTURE.md)** - Deep dive into Web3 model
- **[docs/TIER_COMPARISON.md](docs/TIER_COMPARISON.md)** - Feature details (if exists)
- **[TIER_SYSTEM_IMPLEMENTATION.md](TIER_SYSTEM_IMPLEMENTATION.md)** - Technical details (if exists)

---

## ❓ FAQ

### How much does it cost?
**Visitor**: Free (view-only)  
**Holder**: ~$30-100 one-time buy of $WAG  
**Whale**: ~$100-500 one-time buy of $WAG

Then use forever, no recurring payments!

### What data do you collect?
Only your wallet address (required for tier checking). No email, password, or personal info.

### Can I get a refund?
No refunds on tools, but you own $WAG tokens which you can sell on Uniswap anytime.

### What if I lose my wallet?
Restore using your 12-24 word seed phrase. Your tier returns immediately (blockchain-based).

### Can I run tools offline?
Yes! Desktop client works offline after download. Web API requires internet.

### Is this open source?
Check GitHub repository for license. Core files are in `core/` and `modules/`.

---

## 🔒 Security & Privacy

### Data We Collect
- ✅ Wallet address (required)
- ❌ Email, password, personal info (NOT collected)
- ❌ Credit cards (NOT stored)

### How We Protect It
- ✅ Blockchain verification (immutable)
- ✅ No central database (no data breach risk)
- ✅ Read-only blockchain access
- ✅ All addresses are public (by design)

### Your Responsibilities
- 🔑 Protect wallet seed phrase
- 🔑 Keep MetaMask updated
- 🔑 Only connect to trusted sites
- 🔑 Use hardware wallet for large holdings (optional)

---

## 🚀 Next Steps

1. **Download WAG-Client.exe** from web3-portal.html
2. **Buy $WAG tokens** on Uniswap (if needed)
3. **Run the client** with your wallet address
4. **Generate API key** for programmatic access
5. **Read [WEB3_ARCHITECTURE.md](docs/WEB3_ARCHITECTURE.md)** for deep dive

---

## 📞 Support

- **Questions?** Check FAQ section above
- **Issues?** GitHub Issues
- **Feature requests?** Discussions
- **Security?** Email security team

---

## 📄 License

[See LICENSE file for details]

---

**WAG Tool v3.0 Web3 Edition** | Pure token-gating, pure blockchain ownership. Made for crypto. Made for you. 🚀
