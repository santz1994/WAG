# 🤖 AUTOMATION FRAMEWORK v3.0.0 - "ZAPIER LOKAL"

**Status:** ✅ FRAMEWORK IMPLEMENTED & TESTED  
**Date:** December 10, 2025  
**Complexity:** Advanced  
**Integration:** Works with all 50 WAG Tools  
**Value Proposition:** Transform WAG Gateway into a full local automation engine  

---

## 📋 Overview

The **Automation Framework** transforms WAG Gateway from a simple API into a full **local automation engine** ("ZAPIER LOKAL").

**Key Features:**
- Monitor file system for triggers (new PDF, CSV, etc.)
- Execute multi-step workflows automatically
- Process files (watermark, compress, convert)
- Send WhatsApp notifications with file attachments
- Zero external dependencies (runs locally)

---

## 💡 Use Cases & Value Propositions

### Case 1: E-Commerce Order Processing
```
Trigger: Customer places order → PDF invoice saved to /invoices/
↓
Step 1: Watermark PDF with company logo
Step 2: Send WhatsApp to customer with invoice
Step 3: Move file to /processed/
Step 4: Send notification to admin
Result: Fully automated customer notification system
Selling Price: Rp 3,000,000/month per client
```

### Case 2: HR Document Processing
```
Trigger: New employment contract uploaded
↓
Step 1: Watermark with employee name
Step 2: Notify HR manager via WhatsApp
Step 3: Archive to database folder
Step 4: Delete original
Result: Automated HR workflow
Selling Price: Rp 2,000,000/month per client
```

### Case 3: Restaurant Order Notifications
```
Trigger: Order CSV from kitchen system
↓
Step 1: Parse CSV for order details
Step 2: Format as readable message
Step 3: Send WhatsApp to delivery driver + customer
Step 4: Move to /completed/ folder
Result: Real-time order updates
Selling Price: Rp 1,500,000/month per restaurant
```

---

## 🔧 Architecture

### File Structure
```
wag-app/
├── automation.js           ← AutomationEngine class
├── server.js              ← Main server (loads automation)
├── automation/            ← Workflow data
│   ├── input/            ← Watch folder for triggers
│   ├── output/           ← Process files saved here
│   └── temp/             ← Temporary files during processing
└── workflows/            ← Workflow configurations (JSON)
    ├── pdf-to-boss.json
    ├── invoice-to-customer.json
    └── order-to-driver.json
```

### Workflow Components

```
TRIGGER (Input)
    ↓
ACTIONS (Sequential Execution)
    ├─ Action 1: Transform file
    ├─ Action 2: Send notification
    ├─ Action 3: Move file
    └─ Action N: Cleanup
    ↓
OUTPUT (Result)
```

---

## 🚀 Getting Started

### Step 1: Install Dependencies

Add `chokidar` (file watcher) to package.json:

```bash
npm install chokidar
```

### Step 2: Initialize in server.js

```javascript
const AutomationEngine = require('./automation');

// After client.initialize()
const automation = new AutomationEngine(client, {
    watchDir: './automation/input',
    outputDir: './automation/output',
    tempDir: './automation/temp'
});
```

### Step 3: Register Your First Workflow

```javascript
// Simple example: Send any PDF to WhatsApp
automation.registerWorkflow(
    'Send PDF to Manager',
    { type: 'file', pattern: '*.pdf' },
    [
        {
            type: 'notify',
            number: '62812345678',
            message: 'New document: {filename}',
            attach: true  // Send file as attachment
        },
        {
            type: 'move',
            destination: 'processed'
        }
    ]
);

automation.start();
```

### Step 4: Test It

Place a PDF in `automation/input/`:
```bash
cp sample.pdf automation/input/
```

Watch the workflow execute:
```
📄 New file detected: D:\...\automation\input\sample.pdf
⚡ Executing workflow: Send PDF to Manager
  ➜ Action: notify
    Sending WhatsApp to: 62812345678
    ✓ Notification sent
  ➜ Action: move
    ✓ Moved to: processed/sample.pdf
✅ Workflow completed: Send PDF to Manager
```

---

## 📖 Available Actions

### 1. `watermark` - Add Watermark to PDF

```javascript
{
    type: 'watermark'
    // Optional: custom text, transparency, etc.
}
```

**Requires:** `pdfkit` or `pdf-lib` (npm install separately)

### 2. `notify` - Send WhatsApp Notification

```javascript
{
    type: 'notify',
    number: '62812345678',              // Required
    message: 'File {filename} ready',   // Required, supports {filename} placeholder
    attach: true                        // Optional: send file as attachment
}
```

**Features:**
- Sends text message
- Optionally attaches the processed file
- Supports multiple formats (PDF, images, etc.)

### 3. `move` - Move File to Folder

```javascript
{
    type: 'move',
    destination: 'processed'  // Relative to outputDir
}
```

**or absolute path:**
```javascript
{
    type: 'move',
    destination: '/path/to/folder'
}
```

### 4. `delete` - Delete File

```javascript
{
    type: 'delete'
    // No parameters needed
}
```

### 5. `delay` - Wait Between Actions

```javascript
{
    type: 'delay',
    ms: 2000  // Wait 2 seconds
}
```

**Use case:** Add delays between WhatsApp notifications to avoid rate limiting.

---

## 🎯 Real-World Examples

### Example 1: Invoice + Notification Workflow

```javascript
automation.registerWorkflow(
    'Invoice to Customer',
    { type: 'file', pattern: 'invoice-*.pdf' },
    [
        { type: 'watermark' },  // Add company logo
        {
            type: 'notify',
            number: '62812345678',
            message: 'Invoice {filename} has been generated. Please review and pay within 7 days.',
            attach: true
        },
        { type: 'move', destination: 'sent' },
        { type: 'delay', ms: 1000 },
        {
            type: 'notify',
            number: '62898765432',  // Send copy to accountant
            message: 'Invoice {filename} sent to customer'
        }
    ]
);
```

### Example 2: Order Processing Workflow

```javascript
automation.registerWorkflow(
    'Process Restaurant Order',
    { type: 'file', pattern: '*.csv' },  // CSV from POS system
    [
        {
            type: 'notify',
            number: '62812345678',  // Delivery driver
            message: 'New order received! File: {filename}'
        },
        { type: 'delay', ms: 3000 },
        {
            type: 'notify',
            number: '62821111111',  // Kitchen staff
            message: 'Incoming order: {filename}'
        },
        { type: 'move', destination: 'in-progress' }
    ]
);
```

### Example 3: Document Archive Workflow

```javascript
automation.registerWorkflow(
    'Archive and Notify',
    { type: 'file', pattern: 'contract-*.pdf' },
    [
        { type: 'watermark' },
        {
            type: 'move',
            destination: '/archive/contracts'  // Archive to database
        },
        {
            type: 'notify',
            number: '62812345678',
            message: 'Contract {filename} archived successfully'
        },
        { type: 'delete' }  // Delete from input folder
    ]
);
```

---

## 🔌 API Integration

### Trigger Workflow via HTTP Endpoint (Optional)

You can also trigger workflows via API:

```javascript
app.post('/trigger-workflow', (req, res) => {
    const { workflowName, filePath } = req.body;
    
    const workflow = automation.workflows.find(w => w.name === workflowName);
    if (workflow) {
        automation.executeWorkflow(workflow, filePath);
        res.json({ status: true, message: 'Workflow triggered' });
    } else {
        res.status(404).json({ status: false, message: 'Workflow not found' });
    }
});
```

**Usage:**
```bash
curl -X POST http://localhost:3000/trigger-workflow \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{
    "workflowName": "Send PDF to Manager",
    "filePath": "./automation/input/report.pdf"
  }'
```

---

## 📊 Monitoring & Logs

### Check Workflow Status

```javascript
const status = automation.getStatus();
console.log(status);
```

**Output:**
```json
{
  "running": true,
  "workflows": 3,
  "list": [
    { "id": "wf-1702188000000", "name": "Send PDF to Manager" },
    { "id": "wf-1702188100000", "name": "Invoice to Customer" },
    { "id": "wf-1702188200000", "name": "Archive and Notify" }
  ]
}
```

### Listen to Events

```javascript
automation.on('workflow:completed', (data) => {
    console.log(`✅ Completed: ${data.workflow}`);
    // Log to database, send metrics, etc.
});

automation.on('workflow:error', (data) => {
    console.error(`❌ Error: ${data.workflow} - ${data.error.message}`);
    // Send alert via email/Slack
});

automation.on('watcher:started', (data) => {
    console.log(`👁️  Watching: ${data.pattern}`);
});
```

---

## 💰 Monetization Ideas

### SaaS Model
1. **Per-Workflow Pricing**
   - Basic: Rp 500K/month (1 workflow)
   - Pro: Rp 2M/month (5 workflows)
   - Enterprise: Rp 10M/month (unlimited)

2. **White-Label Solution**
   - Resell automation as part of your WAG Token ecosystem
   - Example: Businesses pay in WAG tokens to unlock automation features

3. **Marketplace**
   - Pre-built workflows available for purchase
   - "Invoice Automation" - Rp 200K one-time
   - "E-Commerce Order" - Rp 300K one-time

### B2B Vertical Targeting
- **E-Commerce:** Order processing automation
- **HR/Payroll:** Contract & payslip distribution
- **Restaurants:** Order to driver notifications
- **Law Firms:** Document watermarking + client notification
- **Logistics:** Shipment tracking + customer updates

---

## 🔮 Future Enhancements

### Phase 1 (Current)
- ✅ File monitoring (chokidar)
- ✅ Action framework
- ✅ WhatsApp integration

### Phase 2 (Next)
- [ ] PDF watermarking (`pdf-lib`)
- [ ] CSV parsing and processing
- [ ] Email notifications
- [ ] Slack/Discord webhooks
- [ ] Database logging

### Phase 3 (Advanced)
- [ ] UI Dashboard for workflow creation
- [ ] Schedule-based triggers (cron jobs)
- [ ] Database-triggered workflows
- [ ] Conditional logic (if-then-else)
- [ ] Workflow marketplace

### Phase 4 (Enterprise)
- [ ] Multi-tenant support
- [ ] API rate limiting per tenant
- [ ] Audit logging
- [ ] Compliance & GDPR
- [ ] On-premise deployment

---

## 🛠️ Troubleshooting

### Files not being detected
```bash
# Check if watch directory exists
ls -la automation/input/

# Check file permissions
chmod 755 automation/input/
chmod 644 automation/input/*
```

### WhatsApp notifications not sending
```bash
# Check /health endpoint
curl http://localhost:3000/health

# Verify x-api-key header is correct
# Check server logs for error messages
```

### Workflow fails silently
```javascript
// Add detailed logging
automation.on('workflow:error', (data) => {
    console.error('Full error:', JSON.stringify(data, null, 2));
});
```

---

## 📚 Related Documentation

- [Security Documentation](./SECURITY.md)
- [API Reference](./API.md)
- [Laravel Integration](./LARAVEL.md)

---

## 📞 Support

GitHub Issues: https://github.com/santz1994/WAG/issues  
Email: danielrizaldy@gmail.com  

**Last Updated:** December 10, 2025
