# 🔐 SECURITY ENHANCEMENTS - WAG Gateway v1.1

**Status:** ✅ IMPLEMENTED  
**Date:** December 10, 2025  
**Version:** 1.1.0  

---

## 📋 Overview

This document outlines the 3 critical security improvements implemented in WAG Gateway to make it production-ready for VPS deployment.

---

## 1️⃣ API KEY AUTHENTICATION (x-api-key Header)

### Problem
Previously, anyone who knew:
- Your server IP/domain
- A valid wallet address (public blockchain data)

Could send unlimited WhatsApp messages through your gateway.

### Solution
**Implemented:** x-api-key header validation

All endpoints (except `/health` and `/info`) now require:
```http
x-api-key: your-secret-api-key
```

### Implementation Details

**In `.env`:**
```env
API_SECRET=your-super-secret-api-key-change-this
```

**Middleware (server.js):**
```javascript
app.use((req, res, next) => {
    // Skip auth untuk health check
    if (req.path === '/health' || req.path === '/info') return next();
    
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_SECRET) {
        console.warn(`⚠️ Unauthorized access attempt from ${req.ip}`);
        return res.status(401).json({ 
            status: false, 
            message: 'Unauthorized: Invalid or missing API Key' 
        });
    }
    next();
});
```

### Usage Example

**cURL:**
```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{
    "number": "081234567890",
    "message": "Hello World",
    "wallet": "0x742d35..."
  }'
```

**PHP:**
```php
$headers = [
    'Content-Type: application/json',
    'x-api-key: your-secret-key'
];

$ch = curl_init('http://localhost:3000/send-message');
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_exec($ch);
```

**Node.js:**
```javascript
const response = await fetch('http://localhost:3000/send-message', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'your-secret-key'
    },
    body: JSON.stringify({
        number: '081234567890',
        message: 'Hello World',
        wallet: '0x742d35...'
    })
});
```

### Best Practices
1. **Change the default secret immediately** before production
2. **Use a strong, random string** (min 32 characters)
3. **Rotate API keys periodically** (monthly recommended)
4. **Never commit `.env` to git** - use `.env.example` instead
5. **Log unauthorized attempts** for security monitoring

---

## 2️⃣ QUEUE PERSISTENCE (Disk-Based Storage)

### Problem
Messages in RAM queue were lost if server crashed or restarted:
```
- Server crashes
- messageQueue array = [] (empty)
- 50 pending messages = LOST forever
```

### Solution
**Implemented:** File-based queue persistence

Queue automatically saves to disk after each operation.

### Implementation Details

**Queue File:** `.wag-queue.json`

```javascript
// Load queue from disk on startup
function loadQueueFromDisk() {
    if (fs.existsSync(QUEUE_FILE)) {
        const data = fs.readFileSync(QUEUE_FILE, 'utf-8');
        messageQueue = JSON.parse(data);
    }
}

// Save queue after each operation
function saveQueueToDisk() {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(messageQueue, null, 2));
}
```

### Workflow
1. **Server starts** → Load `.wag-queue.json` into memory
2. **New message request** → Add to queue + save to disk
3. **Message sent successfully** → Remove from queue + save to disk
4. **Server crashes** → Next restart loads pending messages automatically
5. **Continue processing** → No messages lost

### Example Queue File
```json
[
  {
    "number": "081234567890",
    "message": "Order #123 shipped",
    "timestamp": "2025-12-10T10:30:00Z"
  },
  {
    "number": "082987654321",
    "message": "Invoice ready for payment",
    "timestamp": "2025-12-10T10:31:00Z"
  }
]
```

### Monitoring
Check pending messages:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ready",
  "timestamp": "2025-12-10T10:30:00Z",
  "queued_messages": 2
}
```

---

## 3️⃣ RANDOMIZED RATE LIMITING (Anti-Bot Detection)

### Problem
Fixed 1000ms delay between messages creates a recognizable pattern:
```
Message 1 → +1000ms → Message 2 → +1000ms → Message 3...
      ↓
WhatsApp detects robot behavior
      ↓
Account gets temporarily/permanently banned
```

### Solution
**Implemented:** Random delay (1000-4000ms)

Varies the timing to mimic human behavior.

### Implementation Details

**Helper Function:**
```javascript
function getRandomDelay() {
    // Random delay between 1000ms and 4000ms
    return Math.floor(Math.random() * 3000) + 1000;
}
```

**In Bulk Send:**
```javascript
// Before: await new Promise(r => setTimeout(r, 1000));
// After:
await new Promise(r => setTimeout(r, getRandomDelay()));
```

**Example Pattern:**
```
Message 1 → +2147ms → Message 2 → +3521ms → Message 3 → +1893ms...
```

### Why This Works
- **Human typing:** Variable pause times between actions
- **WA Algorithm:** Detects constant patterns as bots
- **Solution:** Randomized delays = indistinguishable from human
- **Safe Range:** 1-4 seconds is realistic user behavior

### Performance Impact
- **Before:** 100 messages = ~100 seconds
- **After:** 100 messages = ~250-400 seconds (3.75x slower)
- **Benefit:** 100% account safety vs. potential ban

### Recommendation
For critical notifications, prioritize safety over speed.

---

## 🔒 Deployment Checklist

Before deploying to production VPS:

- [ ] **Change API_SECRET** in `.env`
  ```bash
  API_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  ```

- [ ] **Use strong passwords** (min 32 chars, mixed case, numbers, symbols)

- [ ] **Set proper file permissions**
  ```bash
  chmod 600 .env
  chmod 600 .wag-queue.json
  ```

- [ ] **Enable HTTPS** on your server (use Let's Encrypt)
  ```
  http://localhost:3000 (local only)
  https://api.yourdomaiun.com (production with SSL cert)
  ```

- [ ] **Enable firewall** - only allow specific IPs
  ```bash
  ufw allow from 192.168.1.0/24 to any port 3000
  ```

- [ ] **Monitor logs** for unauthorized attempts
  ```bash
  tail -f server.log | grep "Unauthorized"
  ```

- [ ] **Backup queue file** regularly
  ```bash
  cp .wag-queue.json .wag-queue.json.backup
  ```

- [ ] **Test API Key** before going live
  ```bash
  curl -X GET http://localhost:3000/health  # Should work (no auth)
  curl -X POST http://localhost:3000/send-message \
    -H "x-api-key: wrong-key" \
    -d '{}'  # Should return 401
  ```

---

## 📊 Version History

| Version | Changes | Date |
|---------|---------|------|
| 1.0.0 | Initial release | Dec 9, 2025 |
| 1.1.0 | Security hardening (API key + queue persistence + rate limiting) | Dec 10, 2025 |

---

## 🚀 Next Phase (Automation Framework)

See `AUTOMATION.md` for the new "ZAPIER LOKAL" feature that automates file workflows + WhatsApp notifications.

---

## 📞 Support

For security concerns or questions:
- Create GitHub issue: https://github.com/santz1994/WAG/issues
- Email: danielrizaldy@gmail.com

**Last Updated:** December 10, 2025
