# 🚀 WAG API SERVER - SUMMARY

**Produk extension: API Gateway untuk Website Developer**

---

## APA ITU?

WAG API Server adalah jembatan token-gated antara Website Developer dan WhatsApp.

```
[Website Laravel/PHP/Node.js] 
        ↓ HTTP POST
   [WAG API Server]
        ↓ WhatsApp Protocol
     [User Phone]
```

Developer dapat mengirim notifikasi WhatsApp unlimited tanpa biaya per-pesan dari vendor (Twilio, Wablas, dll).

---

## FILES YANG DITAMBAHKAN

- **`server.js`** - API Server utama (token-gated, endpoints lengkap)
- **`/docs/api/API.md`** - Dokumentasi API endpoints
- **`/docs/api/LARAVEL.md`** - Contoh integrasi Laravel/PHP

---

## QUICK START

### Install dependencies
```bash
npm install
```

### Run server
```bash
npm run server
```

### Server akan minta wallet untuk verifikasi lisensi
```
Input: 0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0
```

### Scan QR Code dengan WhatsApp

### Server siap! Test dengan
```bash
curl -X GET http://localhost:3000/health
```

---

## API ENDPOINTS

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check server status |
| `/send-message` | POST | Send 1 message |
| `/send-bulk` | POST | Send multiple messages |
| `/check-license` | POST | Verify wallet license |
| `/info` | GET | Server info |

---

## CONTOH REQUEST

### Send Single Message
```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "number": "081234567890",
    "message": "Halo! Pesanan Anda siap.",
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0"
  }'
```

### Laravel Integration
```php
$wag = app(WagGatewayService::class);
$result = $wag->sendMessage('081234567890', 'Hello World');
```

---

## BUSINESS MODEL

| Vendor | Cost | Model |
|--------|------|-------|
| Twilio/Wablas | Rp 500/msg | Pay per message (Expensive) |
| **WAG Gateway** | **Rp 100K (1x)** | **Buy token once (Unlimited)** |

Developer saves 1000x on notification costs!

---

## SECURITY

✅ Every request verified via blockchain
✅ License checked before sending
✅ No API key needed (blockchain is auth)
✅ WhatsApp session local (not server-controlled)

---

## NEXT STEPS

1. **Test Server:** `npm run server`
2. **Read API Docs:** `/docs/api/API.md`
3. **Integrate Laravel:** See `/docs/api/LARAVEL.md`
4. **Deploy to VPS:** Update RPC to mainnet in .env

---

**WAG API Server ready to launch!** 🎉
