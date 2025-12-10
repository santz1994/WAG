# 🔌 WAG API SERVER v3.0.0 - INTEGRATION GUIDE

**Token-Gated WhatsApp API dengan 50 Production Tools untuk Website Developer**

> **Version:** 3.0.0 | **Status:** ✅ Production Ready | **Tools:** 50/50 Complete

---

## 📍 OVERVIEW

WAG API Server adalah jembatan antara Website Anda dan WhatsApp. Developer dapat mengirim notifikasi WhatsApp langsung dari aplikasi mereka tanpa biaya vendor resmi.

**Model Bisnis:**
- Developer bayar 1x untuk token WAG
- Kirim unlimited notifikasi WhatsApp
- No per-message cost (berbeda dari Twilio/Wablas)

---

## 🔐 AUTHENTICATION (REQUIRED)

**All endpoints (except `/health` and `/info`) require API Key authentication.**

### How to Authenticate

Add header to every request:
```
x-api-key: your-secret-api-key
```

### Setting Your API Key

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Change the API_SECRET in `.env`:
```env
API_SECRET=your-super-secret-api-key-change-this
```

3. Use that same key in all requests:
```bash
curl -X POST http://localhost:3000/send-message \
  -H "x-api-key: your-super-secret-api-key-change-this" \
  -H "Content-Type: application/json" \
  -d '{"number":"081234567890","message":"Test","wallet":"0x..."}'
```

**⚠️ Important:** Change the default API_SECRET before going to production!

---

## 🚀 QUICK START

### 1. Run Server
```powershell
cd "d:\Project\Unicorn\WAG Tool\wag-app"
node server.js
```

### 2. Input Wallet
Server akan minta wallet Anda untuk verifikasi lisensi.

### 3. Scan QR Code
Scan dengan WhatsApp untuk authentikasi.

### 4. Ready!
Server siap menerima requests dari website Anda.

---

## 📡 API ENDPOINTS

### 1. Health Check
**Endpoint:** `GET /health`

Check status server. **No authentication required.**

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-12-10T10:30:00Z",
  "queued_messages": 0
}
```

---

### 2. Send Single Message
**Endpoint:** `POST /send-message`

Kirim 1 pesan WhatsApp.

**Headers (Required):**
```
x-api-key: your-secret-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "number": "081234567890",
  "message": "Halo! Order Anda sudah dikirim.",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0"
}
```

**Response (Success):**
```json
{
  "status": true,
  "message": "Pesan terkirim sukses",
  "timestamp": "2025-12-10T10:30:15Z"
}
```

**Response (License Denied):**
```json
{
  "status": false,
  "message": "License Denied. Wallet tidak memiliki WAG token yang cukup."
}
```

---

### 3. Send Bulk Messages
**Endpoint:** `POST /send-bulk`

Kirim multiple messages sekaligus.

**Headers (Required):**
```
x-api-key: your-secret-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "messages": [
    {
      "number": "081234567890",
      "message": "Notifikasi 1"
    },
    {
      "number": "081987654321",
      "message": "Notifikasi 2"
    }
  ],
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0"
}
```

**Response:**
```json
{
  "status": true,
  "total": 2,
  "results": [
    { "number": "081234567890", "status": "success" },
    { "number": "081987654321", "status": "success" }
  ]
}
```

---

### 4. Check License
**Endpoint:** `POST /check-license`

Verifikasi saldo token wallet.

**Request Body:**
```json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0"
}
```

**Response:**
```json
{
  "status": true,
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0",
  "balance": "5000.0",
  "min_required": 1000,
  "has_license": true
}
```

---

### 5. Server Info
**Endpoint:** `GET /info`

Get server information dan available endpoints.

---

## 💻 INTEGRATION EXAMPLES

### Laravel/PHP
```php
<?php
namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;

class NotificationController extends Controller
{
    public function sendOrderNotification($orderId, $userPhone)
    {
        $response = Http::post('http://localhost:3000/send-message', [
            'number' => $userPhone,
            'message' => "Pesanan #{$orderId} Anda sudah dikirim!",
            'wallet' => config('wag.wallet_address')
        ]);

        return $response->json();
    }
}
```

### Node.js/Express
```javascript
const axios = require('axios');

async function sendNotification(phone, message, wallet) {
    try {
        const response = await axios.post('http://localhost:3000/send-message', {
            number: phone,
            message: message,
            wallet: wallet
        });
        
        console.log('Sent:', response.data);
    } catch (error) {
        console.error('Error:', error.response.data);
    }
}
```

### Python/Flask
```python
import requests

def send_notification(phone, message, wallet):
    response = requests.post('http://localhost:3000/send-message', json={
        'number': phone,
        'message': message,
        'wallet': wallet
    })
    
    return response.json()
```

### cURL
```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "number": "081234567890",
    "message": "Test message",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0"
  }'
```

---

## 🔒 SECURITY NOTES

1. **License Check:** Setiap request diverifikasi ke blockchain
2. **Token Required:** Dev harus punya token WAG untuk akses
3. **No API Key:** License via blockchain, tidak perlu API key
4. **Local WhatsApp:** Session tetap di server lokal dev

---

## ⚙️ DEPLOYMENT (PRODUCTION)

### VPS Setup
```bash
# 1. Upload server.js ke VPS
# 2. Install dependencies
npm install

# 3. Update .env dengan RPC mainnet
RPC_URL=https://polygon-rpc.com
TOKEN_ADDRESS=[mainnet-contract]

# 4. Run dengan PM2
npm install -g pm2
pm2 start server.js --name "wag-gateway"
pm2 startup
pm2 save

# 5. Arahkan website ke VPS IP
# http://103.xxx.xxx.xxx:3000/send-message
```

### Environment Variables
```
PORT=3000
TOKEN_ADDRESS=0x4e928F638cFD2F1c75437A41E2d386df79eeE680
MIN_HOLDING=1000
RPC_URL=https://rpc-amoy.polygon.technology
```

---

## 📊 RATE LIMITING

Server menambahkan delay 1 detik antar pesan untuk:
- Menghindari WhatsApp rate limit
- Menghindari shadow ban
- Menjaga reputasi IP

**Kecepatan:** ~3.600 pesan/jam (1 detik per pesan)

---

## ❌ ERROR HANDLING

| Error | Solution |
|-------|----------|
| 503 Service Unavailable | QR belum di-scan. Scan QR code terlebih dahulu |
| 400 Bad Request | Parameter tidak lengkap (number, message, wallet) |
| 403 Forbidden | License Denied - Wallet tidak punya token |
| 500 Internal Server | WhatsApp error - Cek network connection |

---

## 🎯 NEXT STEPS

1. **Test endpoint:** `curl http://localhost:3000/health`
2. **Check license:** `POST /check-license` dengan wallet Anda
3. **Send test message:** `POST /send-message` dengan nomor tes
4. **Integrate:** Gunakan contoh code di aplikasi Anda
5. **Deploy:** Untuk production, gunakan VPS

---

**API Server ready to integrate!** 🚀
