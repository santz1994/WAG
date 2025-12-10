# 📦 BUILD & PACKAGING - v3.0.0

**Ubah Node.js app menjadi Windows executable dengan 50 tools**

**Version:** 3.0.0 | **Status:** ✅ Production Ready

---

## PREREQUISITE

- [ ] Tahap 1 testing = ✅ PASS
- [ ] `pkg` sudah terinstall (part of npm install)
- [ ] `.env` file ready dengan TOKEN_ADDRESS

---

## BUILD .EXE

### Run
```powershell
cd "d:\Project\Unicorn\WAG Tool\wag-app"
npm run pkg
```

### Expected Output
```
fetching v18.19.0
downloading node-v18.19.0-win-x64...  [████] 100%
compiling result...
created: wag-tool.exe
```

**Time:** 2-5 minutes

---

## TEST .EXE (SAME FOLDER)

### Run
```powershell
.\wag-tool.exe
```

### Expected
- Prompt muncul: `Masukkan Alamat Wallet...`
- Test dengan Wallet A (1M) → License valid
- Test dengan Wallet B (0) → Access denied

**Status:** [ ] ✅ PASS [ ] ❌ FAIL

---

## TEST .EXE (DIFFERENT FOLDER)

Ini tes penting: `.exe` harus berjalan tanpa Node.js

### Preparation
```powershell
# Create test folder
mkdir C:\Users\[User]\Desktop\WAG-TEST

# Copy .exe dan .env
Copy-Item wag-tool.exe C:\Users\[User]\Desktop\WAG-TEST\
Copy-Item .env C:\Users\[User]\Desktop\WAG-TEST\
```

### Run
```powershell
cd C:\Users\[User]\Desktop\WAG-TEST
.\wag-tool.exe
```

### Expected
- Same behavior as Tahap 1 testing
- License gate works
- No Node.js needed

**Status:** [ ] ✅ PASS [ ] ❌ FAIL

---

## ✅ COMPLETION

- [ ] File `wag-tool.exe` created (50-80 MB)
- [ ] Tested di folder asli = PASS
- [ ] Tested di folder berbeda = PASS
- [ ] `.env` included

**Ready untuk distribusi!** 🎉

---

## 🔴 TROUBLESHOOTING

**Build error**
```powershell
rm wag-tool.exe
npm install
npm run pkg
```

**Module not found**
```powershell
npm install
npm run pkg
```

**.exe crash**
- Pastikan `.env` ada di same folder
- Cek RPC_URL & TOKEN_ADDRESS

---

## NEXT

Pilih opsi:
1. **Stop di Testnet** → Gunakan untuk portfolio/demo
2. **Lanjut Tahap 3** → Deploy ke Mainnet (need POL tokens)

Tunggu instruksi selanjutnya!
