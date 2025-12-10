# 🧪 TAHAP 1: TESTING LICENSE GATE

**Verifikasi bahwa License Gate bekerja sesuai design.**

---

## 📋 PRE-TEST CHECKLIST

- [ ] MetaMask installed
- [ ] 2 wallets ready (A: deployer dengan 1M WAG, B: empty)
- [ ] Terminal PowerShell di folder `wag-app`
- [ ] `.env` file exists dengan TOKEN_ADDRESS & RPC_URL
- [ ] `npm install` sudah done

---

## 🟢 SKENARIO A: AKSES DIBERIKAN (SULTAN)

### Run
```powershell
cd "d:\Project\Unicorn\WAG Tool\wag-app"
node app.js
```

### Input
```
Masukkan Alamat Wallet Polygon Anda (0x...): [WALLET A - 1M WAG]
```

### Expected Output
```
Saldo WAG Anda: 1000000.0 Token
✅ LISENSI VALID! Akses Diberikan.
[QR Code ditampilkan]
✅ CLIENT WHATSAPP SIAP!
```

### Bot Test
Ketik dari WhatsApp: `!ping`
Expected reply: `🏓 pong - WAG Tool Active`

**Status:** [ ] ✅ PASS [ ] ❌ FAIL

---

## 🔵 SKENARIO B: AKSES DITOLAK (MISKIN)

### Run (stop bot sebelumnya dengan Ctrl+C)
```powershell
node app.js
```

### Input
```
Masukkan Alamat Wallet Polygon Anda (0x...): [WALLET B - 0 WAG]
```

### Expected Output
```
Saldo WAG Anda: 0.0 Token
❌ AKSES DITOLAK.
Syarat: Hold minimal 1000 WAG.
❌ Akses ditolak. Menutup aplikasi dalam 5 detik...
[Aplikasi close, NO QR CODE muncul]
```

**PENTING:** QR Code harus **TIDAK** muncul. Jika muncul = security hole!

**Status:** [ ] ✅ PASS [ ] ❌ FAIL

---

## 🏆 FINAL RESULT

### If Both PASS ✅✅
```
🎉 License Gate = 100% AMAN
✅ Ready untuk TAHAP 2: PACKAGING
```

### If FAIL ❌
```
⚠️ Debug issue
📝 See troubleshooting di bawah
```

---

## 🔴 TROUBLESHOOTING

**"Saldo: 0.0" padahal punya banyak**
- Cek `.env`: TOKEN_ADDRESS = `0x4e928F638cFD2F1c75437A41E2d386df79eeE680`
- Cek `.env`: RPC_URL = `https://rpc-amoy.polygon.technology`

**"QR Code hang"**
- Tunggu 30-60 detik (normal pertama kali)
- Jika hang, delete folder `.wwebjs_auth` lalu retry

**"Cannot find module"**
```powershell
npm install
node app.js
```

**Wallet tidak recognized**
- Format harus: `0x` + 40 character hex
- Copy dari MetaMask (jangan manual type)

---

## 📝 DOKUMENTASI HASIL

Setelah testing selesai, gunakan file: `TEMPLATE.md`

Catat:
- Wallet A & B addresses
- Output dari setiap skenario
- Status: PASS atau FAIL
- Error (jika ada)

---

## ✅ NEXT AFTER PASS

1. Document result di `TEMPLATE.md`
2. Read: `/docs/packaging/PACKAGING.md`
3. Run: `npm run pkg`
4. Done!

---

**Start testing now!** 🚀

```powershell
node app.js
```
