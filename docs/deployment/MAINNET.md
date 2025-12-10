# 💰 TAHAP 3: MAINNET DEPLOYMENT (COMING SOON)

**Pindah dari Amoy testnet ke Polygon Mainnet production**

---

## PREREQUISITE

- ✅ Tahap 1 & 2 completed
- 💰 POL tokens (minimal 10-15 POL untuk gas + liquidity)
- ⏰ Ready untuk operasional

---

## OVERVIEW

| Step | Details | Cost |
|------|---------|------|
| 1. Buy POL | Dari exchange (Binance, etc) | ~7 POL |
| 2. Deploy Contract | Deploy WAGToken.sol ke Mainnet | ~0.5 POL |
| 3. Liquidity Pool | Create WAG/MATIC di QuickSwap | ~2 POL |
| 4. Launch | Update config & deploy .exe | Free |

---

## TIMELINE

- Day 1: Buy POL + setup wallet
- Day 2: Deploy contract + verify
- Day 3: Create liquidity pool
- Day 4+: Live & earning!

---

## DETAILED STEPS

### Step 1: Buy POL
1. Go to exchange (Binance, Kraken, etc)
2. Buy ~15 POL
3. Send to your wallet on Polygon Mainnet

### Step 2: Deploy Contract
1. Open Remix IDE
2. Deploy WAGToken.sol to Polygon Mainnet
3. Record new contract address

### Step 3: Update .env
```env
TOKEN_ADDRESS=[new-mainnet-address]
RPC_URL=https://polygon-rpc.com
MIN_HOLDING=1000
```

### Step 4: Create Liquidity Pool
1. Go to QuickSwap
2. Create WAG/MATIC pair
3. Add liquidity (e.g., 100,000 WAG + 5 MATIC)
4. Token now has market price

### Step 5: Launch
1. Build new .exe: `npm run pkg`
2. Distribute to users
3. Users buy WAG from QuickSwap
4. Revenue flowing!

---

## NEXT

File ini akan di-update dengan detailed steps ketika Anda siap untuk Tahap 3.

Untuk sekarang, fokus ke Tahap 1 & 2!

---

**When ready, let me know!** 🚀
