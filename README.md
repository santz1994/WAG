# WAG Tool - WhatsApp Gateway with Free & Premium Tiers

> **Version: 3.0.0** | **Status:** ✅ **PRODUCTION READY** | **50/50 Tools Complete (100%)**
> 
> **🎁 FREE forever OR ⭐ PREMIUM for unlimited**

## 🚀 Apa Itu WAG Tool?

WAG Tool adalah Micro-SaaS self-hosted yang mengubah WhatsApp pribadi menjadi API gateway dengan 50 production-ready tools. Tersedia dalam 3 paket:

- **🎁 FREE** - Untuk individu (100 req/hari, 13 tools, gratis selamanya)
- **⭐ PREMIUM** - Untuk profesional ($99/bulan, 50 tools, unlimited requests)
- **🏢 ENTERPRISE** - Custom pricing untuk organisasi besar

### Fitur Utama:
- ✅ **50 Production-Ready Tools** - Lengkap dari WhatsApp hingga system tools
- ✅ **Self-hosted** - Berjalan di laptop, kontrol penuh data
- ✅ **Flexible Pricing** - FREE forever atau upgrade ke PREMIUM
- ✅ **API Key Management** - Multiple keys per user
- ✅ **Usage Tracking** - Monitor penggunaan real-time
- ✅ **Easy Upgrade** - Via crypto (USDT) atau card (Stripe)
- ✅ **WhatsApp Integration** - QR code authentication
- ✅ **Tier-Based Access** - Features unlock saat upgrade

---

## 💰 Comparison: FREE vs PREMIUM vs ENTERPRISE

| Feature | FREE | PREMIUM | ENTERPRISE |
|---------|------|---------|-----------|
| **Harga** | 🎁 Gratis | $99/mo | Custom |
| **Tools** | 13 tools | 50 tools | 50+ custom |
| **API Keys** | 1 | 50 | Unlimited |
| **Daily Requests** | 100 | 100,000 | Unlimited |
| **Monthly Requests** | 2,000 | 3,000,000 | Unlimited |
| **Priority Support** | ❌ | ✅ | ✅ Dedicated |
| **Custom Domain** | ❌ | ✅ | ✅ |
| **Analytics** | ❌ | ✅ | ✅ |
| **Webhooks** | ❌ | ✅ | ✅ |
| **SSO** | ❌ | ✅ | ✅ |

### What's Included in Each Tier:

**FREE Tier (13 Tools)**:
```
✅ check-license         (License verification)
✅ text-to-speech       (Limited 100 chars/day)
✅ greeting-card        (Card generator)
✅ pdf-merge            (Up to 5 pages/day)
✅ api-documentation    (API docs)
✅ code-snippet-storage (Store code)
✅ weather-app          (Basic info)
✅ user-profile         (Profile manager)
✅ settings-manager     (Settings sync)
✅ changelog-generator  (Auto changelog)
✅ logo-generator       (Basic logos)
✅ todo-manager         (Todo app)
✅ notification-center  (Notifications)
```

**PREMIUM Tier (ALL 50 Tools)**:
```
✅ EVERYTHING in FREE +
✅ Full WhatsApp Gateway (unlimited)
✅ Advanced AI Tools (TTS unlimited)
✅ Document Processing (full access)
✅ Crypto & Blockchain (all tools)
✅ Security & Privacy (all tools)
✅ System Management (all tools)
✅ And 30+ more professional tools!
```

---

## 📋 Prerequisites

Sebelum mulai:

1. **Node.js** v16+ ([Download](https://nodejs.org/))
2. **Wallet** (MetaMask, Phantom, atau apapun yang support Web3)
3. **WhatsApp Account** (personal atau business)
4. **Internet Connection** yang stabil

---

## 🎯 Quick Start: 5 Menit

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
