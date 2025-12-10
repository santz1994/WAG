# WAG Tool Web3 Portal - Quick Setup Guide

## 🚀 How to Test the Web3 Portal Locally

### Step 1: Install MetaMask Browser Extension
1. Go to **https://metamask.io/download**
2. Select your browser (Chrome, Firefox, Edge, etc.)
3. Click "Install MetaMask for [Browser]"
4. Add the extension to your browser
5. Create a new wallet or import existing one
6. **Save your seed phrase securely!**

### Step 2: Add Polygon Network (Optional)
MetaMask should auto-detect, but you can manually add:
1. Click MetaMask icon in browser
2. Click network dropdown (top)
3. Click "Add Network"
4. Fill in:
   - Network Name: `Polygon`
   - RPC URL: `https://polygon-rpc.com`
   - Chain ID: `137`
   - Symbol: `MATIC`
   - Explorer: `https://polygonscan.com`
5. Click Save

### Step 3: Get Test $WAG Tokens
For testing, you have options:

**Option A: Local Testing (Recommended)**
- Edit `core/token-checker.js` line ~20
- Change `balanceOf()` to return test value
- Or create mock token checker for testing

**Option B: Uniswap Testnet**
- Buy real $WAG tokens on Polygon mainnet
- Small amount (~$50-100 for testing)

**Option C: Faucet (If deployed)**
- Deploy test token contract
- Create faucet to distribute test tokens

### Step 4: Open Web3 Portal
1. **Local Testing:**
   ```bash
   # Option 1: Simple HTTP server
   python -m http.server 8000
   # Then open: http://localhost:8000/web3-portal.html
   
   # Option 2: Node.js http-server
   npx http-server
   # Then open: http://localhost:8080/web3-portal.html
   
   # Option 3: Node.js built-in
   npm start
   # Then open: http://localhost:3000/web3-portal.html
   ```

2. **Or open directly:**
   - File path: `d:\Project\Unicorn\WAG Tool\wag-app\web3-portal.html`
   - Right-click → "Open with" → Browser

### Step 5: Connect Wallet
1. Page loads → See "🔗 Connect Wallet" button
2. If MetaMask installed: Button is enabled
3. If MetaMask NOT installed: 
   - Button shows warning
   - Installation guide appears
   - Follow guide to install MetaMask

4. Click "🔗 Connect Wallet"
5. MetaMask popup appears
6. Click "Next" → "Connect"
7. Grant permission to view address

### Step 6: View Your Tier
Portal will show:
- ✅ Your wallet address
- ✅ Your $WAG token balance
- ✅ Your tier (Visitor/Holder/Whale)
- ✅ Tools available
- ✅ Tokens to next tier

### Step 7: Generate API Key
1. Click "🔑 Generate API Key (Cloud)"
2. API key appears:
   ```
   wag_3h4k8d9j2k3j4h5j6k7l8m9n0p
   ```
3. Copy and save for API calls

### Step 8: Download Desktop Client
1. Click "📥 Download WAG-Client.exe"
2. File downloads (150MB)
3. Extract and run
4. Enter your wallet address
5. See menu with tools
6. Execute tools!

---

## 🔧 Troubleshooting

### Error: "MetaMask not installed"
**Solution:**
1. Visit https://metamask.io/download
2. Install extension for your browser
3. Refresh this page
4. Try again

### Error: "Invalid wallet address"
**Solution:**
- Make sure wallet address is valid (starts with 0x)
- Try different wallet address
- Check MetaMask is on Polygon network

### Error: "Failed to fetch balance"
**Solution:**
1. Check Polygon RPC is working:
   - Open DevTools (F12)
   - Check console for errors
2. Verify token contract address in `core/token-checker.js`
3. Ensure contract is deployed on Polygon

### Portal loads but no connect button visible
**Solution:**
1. Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Try different browser
4. Check browser console for errors (F12)

### Tier shows "Visitor" even with tokens
**Solution:**
1. Refresh page after buying tokens
2. Wait 30+ seconds for blockchain confirmation
3. Check you're on Polygon network (not mainnet)
4. Verify token balance on PolygonScan

---

## 📝 Testing Checklist

Use this to verify everything works:

```
Setup:
  ✅ MetaMask installed
  ✅ Polygon network added
  ✅ Test wallet created with tokens
  
Portal Tests:
  ✅ Web3 Portal loads
  ✅ "Connect Wallet" button visible
  ✅ Click button → MetaMask popup
  ✅ Grant permission
  ✅ Wallet address displays
  ✅ Token balance displays
  ✅ Tier displays correctly
  
Feature Tests:
  ✅ "Generate API Key" works
  ✅ "Buy on Uniswap" links correctly
  ✅ "Download EXE" button visible (if Holder+)
  ✅ Disconnect button works
  ✅ Refresh page → Tier persists
  
Tier Tests:
  Visitor (0 WAG):
    ✅ Shows "View-only" access
    ✅ "Buy $WAG" button visible
    ✅ No download/API key buttons
    
  Holder (1,000+ WAG):
    ✅ Shows "Holder Tier"
    ✅ "13 tools" displayed
    ✅ Download & API key buttons visible
    
  Whale (10,000+ WAG):
    ✅ Shows "Whale Tier"
    ✅ "All 50 tools" displayed
    ✅ All features unlocked
```

---

## 🌐 Deploying to Production

Once testing works locally, deploy:

### Option 1: Vercel (Easy, Free)
```bash
vercel deploy --prod
# Opens web3-portal.html at yourdomain.vercel.app
```

### Option 2: IPFS (Decentralized)
```bash
# Using Pinata or Infura
# Upload web3-portal.html
# Get IPFS CID: QmXx...
# Share: https://ipfs.io/ipfs/QmXx...
```

### Option 3: GitHub Pages
```bash
# Copy web3-portal.html to gh-pages branch
# Access at: yourusername.github.io/WAG-Tool/web3-portal.html
```

### Option 4: Your Server
```bash
# Copy web3-portal.html to web server
# Access at: yourdomain.com/web3-portal.html
```

---

## ✅ What's Next

1. ✅ Test Web3 Portal locally
2. ✅ Deploy to production (Vercel/IPFS)
3. ✅ Build WAG-Client.exe
4. ✅ Get first users with $WAG tokens
5. ✅ Launch! 🚀

---

**Questions?** Check the full docs in `docs/WEB3_ARCHITECTURE.md`
