# ✅ TESTING CHECKLIST

**Gunakan checklist ini saat testing berlangsung**

---

## PRE-TEST

- [ ] MetaMask installed
- [ ] Wallet A ready (1M WAG)
- [ ] Wallet B ready (0 WAG)
- [ ] Terminal open di wag-app folder
- [ ] `.env` configured
- [ ] `npm install` done

---

## SKENARIO A (SULTAN)

```
Command: node app.js
Input: Wallet A (1M WAG)
```

Checkpoints:
- [ ] Saldo = 1000000.0 Token
- [ ] "LISENSI VALID" message
- [ ] QR Code muncul
- [ ] WhatsApp authenticated
- [ ] Bot !ping → pong

**Result:** [ ] ✅ PASS [ ] ❌ FAIL

---

## SKENARIO B (MISKIN)

```
Command: node app.js
Input: Wallet B (0 WAG)
```

Checkpoints:
- [ ] Saldo = 0.0 Token
- [ ] "AKSES DITOLAK" message
- [ ] QR Code **NOT** muncul
- [ ] Aplikasi auto-close
- [ ] Tidak ada bypass

**Result:** [ ] ✅ PASS [ ] ❌ FAIL

---

## FINAL STATUS

- [ ] ✅ Both scenarios PASS → Ready for Tahap 2
- [ ] ❌ Failed → Debug & retry

**Timestamp:** ___________
**Tester:** ___________
