# WAG Tool - WhatsApp Gateway with Free & Premium Tiers

> **Version: 3.0.0** | **Status:** ✅ **PRODUCTION READY** | **50/50 Tools Complete (100%)**
> 
> **🎁 FREE forever OR ⭐ PREMIUM for unlimited**

## 🚀 Apa Itu WAG Tool?

WAG Tool is a **pure Web3 platform** with 50 production-ready crypto & utility tools. Access is determined entirely by how many **$WAG tokens** you hold in your wallet on Polygon network.

**No subscriptions. No databases. No lock-in. Pure blockchain ownership.**

- 🪙 **Hold $WAG** → Get Access to Tools
- 🔗 **Use Web3 Portal** → Connect wallet, download client
- ⚙️ **Run Desktop App** → All 50 tools offline-capable
- 🚀 **Deploy API** → Self-hosted server for developers

### Key Differences from Web2 SaaS

| Aspect | Traditional SaaS | WAG Tool Web3 |
|--------|------------------|---------------|
| **Payment** | Monthly recurring | One-time token purchase |
| **Access Control** | Company database | Blockchain (immutable) |
| **User Data** | Email, password stored | Wallet address only |
| **Ownership** | You rent access | You own $WAG tokens |
| **Cancellation** | Need to unsubscribe | Just sell tokens |
| **Privacy** | Data collected | Minimal data collection |
| **Censorship** | Can be kicked out | Only blockchain can limit |

---

## 🏆 Three Token Tiers

Your access is **automatically determined** by your $WAG token balance on Polygon. Check your tier instantly at [web3-portal.html](#).

### 🌐 Visitor Tier (0 - 999 $WAG)
```
✅ View documentation
✅ See all available tools  
✅ Understand tier system
❌ Execute any tools

Next Step: Buy 1,000 $WAG on Uniswap (~$30-100)
```

### 💎 Holder Tier (1,000 - 9,999 $WAG)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Register User

```bash
# Register dengan wallet Anda
curl -X POST http://localhost:3000/api/tier/register \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0",
    "metadata": {
      "email": "user@example.com",
      "name": "Your Name"
    }
  }'
```

**Response**: User terdaftar dengan FREE tier 🎁

### Step 2: Generate API Key

```bash
curl -X POST http://localhost:3000/api/keys/generate \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0",
    "name": "My First Key"
  }'
```

**Response**: Dapatkan API key untuk akses tools

### Step 3: Use Tools (Free Tier)

```bash
# Use text-to-speech tool (FREE tier)
curl -X POST http://localhost:3000/tools/text-to-speech \
  -H "Authorization: Bearer wag_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello World",
    "language": "id"
  }'
```

### Step 4: Check Usage

```bash
curl http://localhost:3000/api/tier/0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0/usage
```

**Response**: Lihat berapa banyak yang sudah dipakai dari quota

### Step 5: Upgrade ke PREMIUM (Optional)

```bash
# Upgrade untuk akses unlimited
curl -X POST http://localhost:3000/api/tier/0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0/upgrade-to-premium \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 30,
    "paymentMethod": "crypto",
    "txHash": "0x1234567890abcdef..."
  }'
```

✅ Selesai! Sekarang Anda punya akses ke 50 tools!

---

## 🔧 Installation

```bash
# Clone repo
git clone https://github.com/santz1994/WAG.git
cd WAG/wag-app

# Install dependencies
npm install

# Setup .env
cp .env.example .env
# Edit .env sesuai kebutuhan

# Start server
npm start
```

Server akan berjalan di `http://localhost:3000`

---

## 💳 Payment & Upgrade

### Upgrade via Crypto (USDT on Polygon)

```bash
# 1. Get upgrade quote
curl -X POST http://localhost:3000/api/tier/0x.../get-upgrade-quote \
  -d '{"duration": 30}'

# 2. Send USDT to payment address (shown in quote)

# 3. Verify payment
curl -X POST http://localhost:3000/api/tier/0x.../validate-payment \
  -d '{"txHash": "0x...", "chainId": 137}'

# 4. Upgrade confirmed! Premium access unlocked ✅
```

### Upgrade via Card (Stripe)

```bash
# Coming soon - Subscribe via Stripe dashboard
```

---

## 📊 Tier Management API

### Check Current Tier
```bash
GET /api/tier/:wallet
```

### List All Tiers
```bash
GET /api/tier/comparison
```

### Check Tool Access
```bash
POST /api/tier/check-access
Body: {"wallet": "0x...", "toolName": "text-to-speech"}
```

### View Usage Stats
```bash
GET /api/tier/:wallet/usage
```

### Upgrade to Premium
```bash
POST /api/tier/:wallet/upgrade-to-premium
Body: {"duration": 30, "paymentMethod": "crypto"}
```

### Downgrade to Free
```bash
POST /api/tier/:wallet/downgrade-to-free
```

---

## 🔐 Security & Data

- **Self-Hosted** - Semuanya berjalan di komputer Anda
- **No Data Collection** - Kami tidak menyimpan data pribadi Anda
- **Wallet Based** - Akun teridentifikasi by wallet, tidak perlu email
- **API Keys** - SHA-256 encrypted, tidak reversible
- **Tier Verification** - Blockchain timestamp, tidak bisa dipalsukan

---

## ❓ FAQ

### Q: Apakah FREE tier benar-benar gratis?
A: Ya! Selamanya gratis. Upgrade ke PREMIUM jika butuh lebih banyak tools/requests.

### Q: Apa beda self-hosted vs SaaS?
A: Self-hosted = berjalan di laptop Anda. Data tidak dikirim ke server pihak ketiga.

### Q: Bisakah saya downgrade dari PREMIUM ke FREE?
A: Ya, kapan saja. Akan kehilangan akses premium tools tetapi data tetap aman.

### Q: Berapa lama subscription PREMIUM?
A: Tersedia monthly, quarterly, atau yearly. Anda bisa downgrade kapan saja.

### Q: Apakah bisa deploy di server?
A: Ya! WAG Tool bisa di-deploy di VPS, AWS, Digital Ocean, atau server apapun.

---

## 📚 Full Documentation

Lihat folder `/docs` untuk dokumentasi lengkap:
- **[Quick Start](./docs/QUICK_START.md)** - Mulai cepat
- **[API Reference](./docs/api/API.md)** - Semua endpoints
- **[Tools Roadmap](./docs/TOOLS_ROADMAP.md)** - Daftar semua tools
- **[Architecture](./docs/ARCHITECTURE.md)** - System design

---

## 🤝 Support

- **Documentation**: Check `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@wagtool.io

---

## 📄 License

MIT License - Anda bebas menggunakan, modify, dan distribute

---

**Made with ❤️ by Daniel Rizaldy**
