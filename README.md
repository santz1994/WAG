# WAG Tool - WhatsApp Gateway Token Gated Software

## 🚀 Apa Itu WAG Tool?

WAG Tool adalah Micro-SaaS self-hosted yang mengubah WhatsApp pribadi menjadi API gateway. User hanya perlu memegang 1,000 token $WAG untuk akses seumur hidup - tanpa biaya langganan bulanan.

### Fitur Utama:
- ✅ Self-hosted (software berjalan di laptop user)
- ✅ Token-gated access (hold 1,000 WAG = akses permanent)
- ✅ WhatsApp integration (QR code based authentication)
- ✅ Blockchain verification (live saldo check via Polygon)

---

## 📋 Prerequisites

Sebelum mulai, pastikan punya:

1. **Node.js** v16+ ([Download](https://nodejs.org/))
2. **MetaMask Wallet** ([Download](https://metamask.io/))
3. **Polygon Network** di MetaMask (sudah default)
4. **Polygon Tokens** (minimal 0.1 MATIC untuk gas fee)
5. **WhatsApp Account** (personal/business)

---

## 🔧 Langkah 1: Deploy Smart Contract (Token)

### 1.1 Buka Remix IDE
```
Buka browser, pergi ke: https://remix.ethereum.org
```

### 1.2 Create File Baru
- Klik menu di sebelah kiri
- Buat file baru: `WAGToken.sol`
- Copy-paste isi dari `WAGToken.sol` di folder ini

### 1.3 Compile Contract
- Tab `Solidity Compiler` (kiri)
- Pilih Compiler: `0.8.x` (atau lebih baru)
- Klik `Compile WAGToken.sol`
- Tunggu sampai compile success ✅

### 1.4 Deploy ke Polygon Amoy Testnet
- Tab `Deploy & Run Transactions`
- Environment: Pilih `Injected Provider - MetaMask`
- Network di MetaMask harus: **Polygon Amoy** (Chain ID: 80002)
- Contract: Pilih `WAGToken`
- Klik tombol `Deploy`
- Confirm di MetaMask popup
- **Tunggu konfirmasi blockchain** (±30 detik)

### 1.5 Catat Contract Address
Setelah deploy sukses, akan ada contract address muncul di bawah:
```
0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0
```
⚠️ **COPY ADDRESS INI!** Anda butuhnya untuk langkah berikutnya.

---

## ⚙️ Langkah 2: Setup Configuration

### 2.1 Edit File `.env`
Buka file `.env` di folder `wag-app/`, edit seperti ini:

```env
# Paste contract address dari Remix
TOKEN_ADDRESS=0x4e928F638cFD2F1c75437A41E2d386df79eeE680

# Minimal holding
MIN_HOLDING=1000

# RPC URL (gunakan yang sudah terbukti working)
RPC_URL=https://rpc-amoy.polygon.technology
```

### 2.2 Verifikasi
- Pastikan format address: `0x` + 40 karakter hexadecimal
- Pastikan TOKEN_ADDRESS sesuai dengan contract yang di-deploy di Amoy
- Pastikan MIN_HOLDING adalah angka bulat
- Pastikan RPC_URL: `https://rpc-amoy.polygon.technology` (untuk testnet)
- Save file `.env`

---

## 📦 Langkah 3: Install Dependencies

Buka terminal/PowerShell di folder `wag-app/`, jalankan:

```powershell
npm install
```

Ini akan download semua dependencies yang dibutuhkan. Tunggu 2-5 menit.

---

## 🧪 Langkah 4: Test Aplikasi

### 4.1 Jalankan Aplikasi

```powershell
npm start
```

Output yang keluar:
```
==========================================
   WAG TOOL - TOKEN GATED SOFTWARE v1.0   
==========================================

Masukkan Alamat Wallet Polygon Anda (0x...): 
```

### 4.2 Input Wallet Address
Masukkan address wallet Anda (yang punya token):
```
0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0
```

### 4.3 Cek Lisensi
App akan:
1. Connect ke Polygon blockchain
2. Check saldo token Anda
3. Jika >= 1,000 WAG → ✅ Lanjut
4. Jika < 1,000 WAG → ❌ Exit

### 4.4 Scan QR Code
Jika lisensi valid, muncul QR code:
```
┌─────────────────┐
│ ██ ▀▄▀█ ██ ▀▄▀ │
│ ▀▀ █▀█ ▀▀ █▀█ │
└─────────────────┘
```

Ambil hp Anda:
1. Buka WhatsApp
2. Buka Settings → Linked Devices
3. Scan QR code di terminal
4. Confirm di hp

### 4.5 Bot Aktif
Setelah scan berhasil:
```
✅ CLIENT WHATSAPP SIAP!
Wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0
Status: Running
```

Bot siap! Test dengan kirim pesan `!ping` ke WhatsApp pribadi Anda.

---

## 🎯 Fitur Bot (Demo)

Saat ini tersedia:
- `!ping` → Bot reply: `pong - WAG Tool Active`
- `!help` → Show bantuan
- `!wallet` → Show wallet info

Anda bisa extend fitur ini di dalam function `client.on('message', ...)` di `app.js`.

---

## 📦 Langkah 5: Package ke .EXE (Optional)

Untuk distribusi ke user tanpa Node.js installed:

### 5.1 Install PKG Global
```powershell
npm install -g pkg
```

### 5.2 Compile ke .EXE
```powershell
npm run pkg
```

Hasilnya: `wag-tool.exe` di folder `wag-app/`

### 5.3 Distribusikan
- Pindahkan `.exe` ke user
- User bisa langsung run tanpa install Node.js
- Kode Anda tersembunyi (di-compile)

---

## 🔒 Keamanan

### Blockchain Level:
- Smart contract di-verify di blockchain
- Saldo real-time, tidak bisa dipalsukan
- Token non-custodial (user kontrol private key)

### Application Level:
- Kode di-compile ke .EXE (tidak bisa dibaca)
- Setiap run, check ulang saldo
- WhatsApp session encrypted locally

### Tips Tambahan:
- Jangan share private key Anda
- Gunakan official MetaMask saja
- Verify contract di PolygonScan sebelum deploy

---

## 🛠️ Troubleshooting

### Error: "Cannot find module 'whatsapp-web.js'"
```powershell
npm install
```
Jalankan ulang.

### Error: "Connection blockchain failed"
1. Cek TOKEN_ADDRESS di `.env` (valid address?)
2. Cek RPC_URL bisa diakses
3. Cek internet connection

### WhatsApp: "Scan failed / QR expired"
- Scan harus dalam 10-15 detik
- Jika timeout, app restart dan scan ulang
- Pastikan WhatsApp settings sudah aktif untuk "Linked Devices"

### "Access denied - hold less than 1000 WAG"
- Wallet Anda memang kurang token
- Beli token di QuickSwap/Uniswap dulu
- Atau setup dummy wallet dengan banyak token untuk testing

---

## 💡 Development Tips

### Menambah Fitur Bot:
Edit bagian ini di `app.js`:

```javascript
client.on('message', msg => {
    if (msg.body === '!ping') {
        msg.reply('🏓 pong');
    }
    // Tambah command baru di sini
    if (msg.body === '!mycommand') {
        msg.reply('Response di sini');
    }
});
```

### Ubah Minimum Holding:
Edit `.env`:
```env
MIN_HOLDING=500  # Ubah dari 1000 menjadi 500
```

### Deploy di Server (Advanced):
Untuk truly production, Anda bisa host di cloud:
- Railway, Render, Heroku, AWS
- Pastikan security: environment variables jangan hardcoded

---

## 📈 Business Model

### Revenue Flow:
1. **User buys token** → Harga token naik
2. **User holds token** → Value appreciation
3. **You sell small % over time** → Passive income

### Marketing:
Create landing page dengan link:
- 🔗 "Buy $WAG" → QuickSwap/Uniswap
- 📥 "Download WAG Tool" → GitHub Release / Website

Template HTML sudah di: `landing-page.html`

---

## 📞 Support

Jika ada issue:
1. Check terminal output (error message biasanya clear)
2. Google error message + "whatsapp-web.js" / "ethers.js"
3. Check GitHub issues di library yang digunakan

---

## 📄 License

MIT License - Anda bebas modify dan distribute.

---

## 📚 Documentation

Semua dokumentasi terorganisir di folder `/docs` dengan max 3 files per kategori:

**👉 [Lihat Documentation Index](./docs/INDEX.md)**

### Quick Links:
- **[Quick Start](./docs/QUICK_START.md)** - Mulai dalam 2 menit
- **[Tools Roadmap](./docs/TOOLS_ROADMAP.md)** - 50+ tools planned
- **[Architecture](./docs/ARCHITECTURE.md)** - System design
- **[API Reference](./docs/api/API.md)** - REST endpoints

---

Anda sekarang punya MVP Micro-SaaS yang:
- ✅ Blockchain-powered licensing
- ✅ Self-hosted (user punya data)
- ✅ Recurring revenue (token appreciation)
- ✅ Low maintenance (no server costs)

Next step: Marketing & user acquisition!

---

**Created with ❤️ for decentralized future**
