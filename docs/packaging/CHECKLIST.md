# ✅ PACKAGING CHECKLIST

---

## PRE-PACKAGING

- [ ] Tahap 1 testing = ✅ PASS
- [ ] `.env` configured
- [ ] `pkg` ready (npm install done)

---

## BUILD

```powershell
npm run pkg
```

- [ ] Build successful
- [ ] File `wag-tool.exe` created
- [ ] Size 50-80 MB

---

## TEST 1: SAME FOLDER

```powershell
.\wag-tool.exe
```

- [ ] Prompt appears
- [ ] Wallet A test = Valid
- [ ] Wallet B test = Denied
- [ ] License gate works

**Status:** [ ] ✅ PASS [ ] ❌ FAIL

---

## TEST 2: DIFFERENT FOLDER

```powershell
cd C:\Users\[User]\Desktop\WAG-TEST
.\wag-tool.exe
```

- [ ] .exe works independently
- [ ] No Node.js needed
- [ ] License gate works
- [ ] Ready for distribution

**Status:** [ ] ✅ PASS [ ] ❌ FAIL

---

## FINAL

- [ ] ✅ Both tests PASS
- [ ] File ready untuk distribution
- [ ] Documentation done

**Date:** ___________
**Status:** [ ] COMPLETE
