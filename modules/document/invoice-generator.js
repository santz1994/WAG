// modules/document/invoice-generator.js
// Invoice Generator Tool - Generate invoices and quotes from templates

const PDFDocument = require('pdfkit');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "Invoice Generator",
    slug: "invoice-gen",
    type: "api",
    version: "1.0.0",
    description: "Generate professional invoices and quotes as PDF",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'generate-invoice':
                    return generateInvoice(params);
                case 'generate-quote':
                    return generateQuote(params);
                case 'batch-generate':
                    return batchGenerate(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Generate single invoice
function generateInvoice(params) {
    try {
        const {
            invoiceNumber,
            invoiceDate,
            dueDate,
            from,
            to,
            items = [],
            notes = '',
            outputPath
        } = params;

        if (!invoiceNumber || !from || !to || !items.length) {
            throw new Error('Required fields: invoiceNumber, from, to, items');
        }

        // Calculate totals
        const itemsWithTotal = items.map(item => ({
            ...item,
            total: (item.quantity || 1) * (item.unitPrice || 0)
        }));

        const subtotal = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);
        const tax = (subtotal * (params.taxRate || 0)) / 100;
        const total = subtotal + tax;

        // Create PDF
        const pdf = new PDFDocument({ size: 'A4', margin: 50 });

        // Write to file or buffer
        if (!outputPath) throw new Error('outputPath is required');

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const stream = fs.createWriteStream(outputPath);
        pdf.pipe(stream);

        // Header
        pdf.fontSize(20).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
        pdf.fontSize(10).font('Helvetica').text(`Invoice #${invoiceNumber}`, { align: 'right' });
        pdf.text(`Date: ${invoiceDate || new Date().toLocaleDateString()}`, { align: 'right' });
        pdf.text(`Due: ${dueDate || ''}`, { align: 'right' });

        pdf.moveTo(50, 130).lineTo(545, 130).stroke();

        // From and To sections
        pdf.fontSize(12).font('Helvetica-Bold').text('FROM:', 50, 150);
        pdf.fontSize(10).font('Helvetica')
            .text(from.name || '', 50, 170)
            .text(from.address || '', 50, 185)
            .text(from.phone || '', 50, 200);

        pdf.fontSize(12).font('Helvetica-Bold').text('TO:', 300, 150);
        pdf.fontSize(10).font('Helvetica')
            .text(to.name || '', 300, 170)
            .text(to.address || '', 300, 185)
            .text(to.email || '', 300, 200);

        // Items table
        pdf.moveTo(50, 240).lineTo(545, 240).stroke();

        pdf.fontSize(11).font('Helvetica-Bold')
            .text('Description', 50, 250)
            .text('Qty', 300, 250)
            .text('Unit Price', 380, 250)
            .text('Total', 480, 250);

        pdf.moveTo(50, 270).lineTo(545, 270).stroke();

        let yPos = 280;
        itemsWithTotal.forEach(item => {
            pdf.fontSize(10).font('Helvetica')
                .text(item.description || '', 50, yPos, { width: 240 })
                .text((item.quantity || 1).toString(), 300, yPos)
                .text('$' + (item.unitPrice || 0).toFixed(2), 380, yPos)
                .text('$' + item.total.toFixed(2), 480, yPos);
            yPos += 30;
        });

        pdf.moveTo(50, yPos).lineTo(545, yPos).stroke();
        yPos += 20;

        // Totals
        pdf.fontSize(10).font('Helvetica')
            .text('Subtotal:', 380, yPos)
            .text('$' + subtotal.toFixed(2), 480, yPos);

        yPos += 20;
        if (params.taxRate) {
            pdf.text(`Tax (${params.taxRate}%):`, 380, yPos)
                .text('$' + tax.toFixed(2), 480, yPos);
            yPos += 20;
        }

        pdf.fontSize(12).font('Helvetica-Bold')
            .text('Total:', 380, yPos)
            .text('$' + total.toFixed(2), 480, yPos);

        // Notes
        if (notes) {
            yPos += 60;
            pdf.fontSize(11).font('Helvetica-Bold').text('Notes:', 50, yPos);
            yPos += 20;
            pdf.fontSize(10).font('Helvetica').text(notes, 50, yPos, { width: 495 });
        }

        pdf.end();

        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                resolve({
                    status: true,
                    action: 'generate-invoice',
                    invoiceNumber,
                    outputPath,
                    subtotal,
                    tax,
                    total,
                    itemCount: items.length,
                    filesize: fs.statSync(outputPath).size,
                    timestamp: new Date().toISOString()
                });
            });
            stream.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Invoice generation error: ${error.message}`);
    }
}

// Generate quote
function generateQuote(params) {
    try {
        const {
            quoteNumber,
            quoteDate,
            expiryDate,
            from,
            to,
            items = [],
            notes = '',
            validUntil = '30 days',
            outputPath
        } = params;

        if (!quoteNumber || !from || !to || !items.length) {
            throw new Error('Required fields: quoteNumber, from, to, items');
        }

        // Calculate totals
        const itemsWithTotal = items.map(item => ({
            ...item,
            total: (item.quantity || 1) * (item.unitPrice || 0)
        }));

        const subtotal = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);
        const tax = (subtotal * (params.taxRate || 0)) / 100;
        const total = subtotal + tax;

        // Create PDF
        const pdf = new PDFDocument({ size: 'A4', margin: 50 });

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const stream = fs.createWriteStream(outputPath);
        pdf.pipe(stream);

        // Header
        pdf.fontSize(20).font('Helvetica-Bold').text('QUOTE', { align: 'right' });
        pdf.fontSize(10).font('Helvetica').text(`Quote #${quoteNumber}`, { align: 'right' });
        pdf.text(`Date: ${quoteDate || new Date().toLocaleDateString()}`, { align: 'right' });
        pdf.text(`Valid Until: ${expiryDate || validUntil}`, { align: 'right' });

        pdf.moveTo(50, 130).lineTo(545, 130).stroke();

        // From and To sections
        pdf.fontSize(12).font('Helvetica-Bold').text('FROM:', 50, 150);
        pdf.fontSize(10).font('Helvetica')
            .text(from.name || '', 50, 170)
            .text(from.address || '', 50, 185)
            .text(from.phone || '', 50, 200);

        pdf.fontSize(12).font('Helvetica-Bold').text('TO:', 300, 150);
        pdf.fontSize(10).font('Helvetica')
            .text(to.name || '', 300, 170)
            .text(to.address || '', 300, 185)
            .text(to.email || '', 300, 200);

        // Items table
        pdf.moveTo(50, 240).lineTo(545, 240).stroke();

        pdf.fontSize(11).font('Helvetica-Bold')
            .text('Description', 50, 250)
            .text('Qty', 300, 250)
            .text('Unit Price', 380, 250)
            .text('Total', 480, 250);

        pdf.moveTo(50, 270).lineTo(545, 270).stroke();

        let yPos = 280;
        itemsWithTotal.forEach(item => {
            pdf.fontSize(10).font('Helvetica')
                .text(item.description || '', 50, yPos, { width: 240 })
                .text((item.quantity || 1).toString(), 300, yPos)
                .text('$' + (item.unitPrice || 0).toFixed(2), 380, yPos)
                .text('$' + item.total.toFixed(2), 480, yPos);
            yPos += 30;
        });

        pdf.moveTo(50, yPos).lineTo(545, yPos).stroke();
        yPos += 20;

        // Totals
        pdf.fontSize(10).font('Helvetica')
            .text('Subtotal:', 380, yPos)
            .text('$' + subtotal.toFixed(2), 480, yPos);

        yPos += 20;
        if (params.taxRate) {
            pdf.text(`Tax (${params.taxRate}%):`, 380, yPos)
                .text('$' + tax.toFixed(2), 480, yPos);
            yPos += 20;
        }

        pdf.fontSize(12).font('Helvetica-Bold')
            .text('Total:', 380, yPos)
            .text('$' + total.toFixed(2), 480, yPos);

        // Notes
        if (notes) {
            yPos += 60;
            pdf.fontSize(11).font('Helvetica-Bold').text('Notes:', 50, yPos);
            yPos += 20;
            pdf.fontSize(10).font('Helvetica').text(notes, 50, yPos, { width: 495 });
        }

        pdf.end();

        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                resolve({
                    status: true,
                    action: 'generate-quote',
                    quoteNumber,
                    outputPath,
                    subtotal,
                    tax,
                    total,
                    itemCount: items.length,
                    validUntil,
                    filesize: fs.statSync(outputPath).size,
                    timestamp: new Date().toISOString()
                });
            });
            stream.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Quote generation error: ${error.message}`);
    }
}

// Batch generate multiple invoices/quotes
function batchGenerate(params) {
    const { documents, outputDirectory, type = 'invoice' } = params;

    if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error('Documents array is required');
    }

    if (!outputDirectory) {
        throw new Error('outputDirectory is required');
    }

    fs.mkdirSync(outputDirectory, { recursive: true });

    const results = [];
    const generateFunc = type === 'quote' ? generateQuote : generateInvoice;

    for (const doc of documents) {
        try {
            const number = doc.invoiceNumber || doc.quoteNumber;
            const filename = `${type}_${number}.pdf`;
            const outputPath = path.join(outputDirectory, filename);

            const result = generateFunc({
                ...doc,
                outputPath
            });

            if (result instanceof Promise) {
                result.then(r => {
                    results.push({
                        ...r,
                        filename,
                        status: 'success'
                    });
                }).catch(err => {
                    results.push({
                        filename,
                        status: 'failed',
                        error: err.message
                    });
                });
            }
        } catch (error) {
            results.push({
                status: 'failed',
                error: error.message
            });
        }
    }

    return {
        status: true,
        action: 'batch-generate',
        type,
        outputDirectory,
        totalDocuments: documents.length,
        note: 'Batch generation in progress. Check outputDirectory for files.',
        timestamp: new Date().toISOString()
    };
}
