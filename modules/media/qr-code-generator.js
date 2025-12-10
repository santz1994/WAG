// modules/media/qr-code-generator.js
// QR Code Generator Tool - Generate QR codes for URLs, text, WiFi, vCards, etc

// Note: This module needs 'qrcode' npm package
// Install with: npm install qrcode

const fs = require('fs');
const path = require('path');

module.exports = {
    name: "QR Code Generator",
    slug: "qr-gen",
    type: "api",
    version: "1.0.0",
    description: "Generate QR codes from text, URLs, WiFi, vCards, and more",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'generate-text':
                    return await generateText(params);
                case 'generate-url':
                    return await generateUrl(params);
                case 'generate-wifi':
                    return await generateWiFi(params);
                case 'generate-vcard':
                    return await generateVCard(params);
                case 'batch-generate':
                    return await batchGenerate(params);
                case 'decode-qr':
                    return await decodeQR(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Generate QR code from text
async function generateText(params) {
    try {
        const QRCode = require('qrcode');
        const {
            text,
            size = 200,
            format = 'png', // png, jpeg, svg, base64
            errorCorrection = 'M', // L, M, Q, H
            margin = 2,
            color = '#000000',
            backgroundColor = '#FFFFFF',
            outputPath
        } = params;

        if (!text) {
            throw new Error('Text is required');
        }

        const options = {
            type: format === 'svg' ? 'image/svg+xml' : `image/${format === 'jpeg' ? 'jpeg' : 'png'}`,
            width: size,
            errorCorrectionLevel: errorCorrection,
            margin: margin,
            color: {
                dark: color,
                light: backgroundColor
            }
        };

        let output;
        const filename = `qr_${Date.now()}.${format}`;
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (format === 'base64') {
            output = await QRCode.toDataURL(text, options);
            return {
                status: true,
                action: 'generate-text',
                format: 'base64',
                data: output,
                text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                size,
                errorCorrection,
                timestamp: new Date().toISOString()
            };
        } else if (format === 'svg') {
            output = await QRCode.toString(text, { type: 'image/svg+xml', ...options });
            if (outputPath) {
                fs.mkdirSync(outputPath, { recursive: true });
                fs.writeFileSync(filepath, output);
            }
            return {
                status: true,
                action: 'generate-text',
                format: 'svg',
                saved: !!outputPath,
                filepath: outputPath ? filepath : null,
                text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                size,
                timestamp: new Date().toISOString()
            };
        } else {
            const buffer = await QRCode.toBuffer(text, options);
            if (outputPath) {
                fs.mkdirSync(outputPath, { recursive: true });
                fs.writeFileSync(filepath, buffer);
            }
            return {
                status: true,
                action: 'generate-text',
                format,
                saved: !!outputPath,
                filepath: outputPath ? filepath : null,
                filesize: buffer.length,
                text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                size,
                errorCorrection,
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        throw new Error(`QR generation error: ${error.message}`);
    }
}

// Generate QR code from URL
async function generateUrl(params) {
    try {
        const QRCode = require('qrcode');
        const {
            url,
            size = 250,
            format = 'png',
            outputPath
        } = params;

        if (!url) {
            throw new Error('URL is required');
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            throw new Error('Invalid URL format');
        }

        const options = {
            type: `image/${format === 'jpeg' ? 'jpeg' : 'png'}`,
            width: size,
            errorCorrectionLevel: 'H',
            margin: 2
        };

        const buffer = await QRCode.toBuffer(url, options);
        const filename = `qr_url_${Date.now()}.${format}`;
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (outputPath) {
            fs.mkdirSync(outputPath, { recursive: true });
            fs.writeFileSync(filepath, buffer);
        }

        return {
            status: true,
            action: 'generate-url',
            format,
            saved: !!outputPath,
            filepath: outputPath ? filepath : null,
            url: url.substring(0, 50) + (url.length > 50 ? '...' : ''),
            filesize: buffer.length,
            size,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`URL QR generation error: ${error.message}`);
    }
}

// Generate WiFi QR code
async function generateWiFi(params) {
    try {
        const QRCode = require('qrcode');
        const {
            ssid,
            password,
            security = 'WPA', // WPA, WEP, nopass
            hidden = false,
            size = 250,
            format = 'png',
            outputPath
        } = params;

        if (!ssid || (!password && security !== 'nopass')) {
            throw new Error('SSID and password are required (unless security is "nopass")');
        }

        // WiFi string format: WIFI:T:WPA;S:SSID;P:PASSWORD;;
        const wifiString = `WIFI:T:${security};S:${ssid};P:${password};H:${hidden ? 'true' : 'false'};;`;

        const options = {
            type: `image/${format === 'jpeg' ? 'jpeg' : 'png'}`,
            width: size,
            errorCorrectionLevel: 'H'
        };

        const buffer = await QRCode.toBuffer(wifiString, options);
        const filename = `qr_wifi_${Date.now()}.${format}`;
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (outputPath) {
            fs.mkdirSync(outputPath, { recursive: true });
            fs.writeFileSync(filepath, buffer);
        }

        return {
            status: true,
            action: 'generate-wifi',
            format,
            saved: !!outputPath,
            filepath: outputPath ? filepath : null,
            ssid,
            security,
            hidden,
            filesize: buffer.length,
            size,
            note: 'Scan with phone to auto-connect to WiFi',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`WiFi QR generation error: ${error.message}`);
    }
}

// Generate vCard QR code (contact card)
async function generateVCard(params) {
    try {
        const QRCode = require('qrcode');
        const {
            firstName,
            lastName,
            phone,
            email,
            organization,
            url,
            address,
            size = 250,
            format = 'png',
            outputPath
        } = params;

        if (!firstName && !lastName) {
            throw new Error('At least firstName or lastName is required');
        }

        // vCard format (v3.0)
        let vcard = 'BEGIN:VCARD\n';
        vcard += 'VERSION:3.0\n';
        vcard += `FN:${firstName} ${lastName}`.trim() + '\n';
        vcard += `N:${lastName};${firstName};;;;\n`;

        if (phone) vcard += `TEL:${phone}\n`;
        if (email) vcard += `EMAIL:${email}\n`;
        if (organization) vcard += `ORG:${organization}\n`;
        if (url) vcard += `URL:${url}\n`;
        if (address) vcard += `ADR:;;${address};;;;;;\n`;

        vcard += 'END:VCARD';

        const options = {
            type: `image/${format === 'jpeg' ? 'jpeg' : 'png'}`,
            width: size,
            errorCorrectionLevel: 'H'
        };

        const buffer = await QRCode.toBuffer(vcard, options);
        const filename = `qr_vcard_${Date.now()}.${format}`;
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (outputPath) {
            fs.mkdirSync(outputPath, { recursive: true });
            fs.writeFileSync(filepath, buffer);
        }

        return {
            status: true,
            action: 'generate-vcard',
            format,
            saved: !!outputPath,
            filepath: outputPath ? filepath : null,
            contact: {
                name: `${firstName} ${lastName}`.trim(),
                phone,
                email,
                organization
            },
            filesize: buffer.length,
            size,
            note: 'Scan to save contact to phone',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`vCard QR generation error: ${error.message}`);
    }
}

// Batch generate QR codes
async function batchGenerate(params) {
    try {
        const QRCode = require('qrcode');
        const {
            items, // Array of { text, filename }
            size = 200,
            format = 'png',
            outputPath
        } = params;

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('Items array is required');
        }

        if (!outputPath) {
            throw new Error('outputPath is required for batch generation');
        }

        fs.mkdirSync(outputPath, { recursive: true });

        const results = [];
        const options = {
            type: `image/${format === 'jpeg' ? 'jpeg' : 'png'}`,
            width: size,
            errorCorrectionLevel: 'M'
        };

        for (const item of items) {
            try {
                const { text, filename } = item;
                if (!text) continue;

                const buffer = await QRCode.toBuffer(text, options);
                const file = filename || `qr_${results.length + 1}.${format}`;
                const filepath = path.join(outputPath, file);

                fs.writeFileSync(filepath, buffer);

                results.push({
                    status: 'success',
                    filename: file,
                    filepath,
                    filesize: buffer.length,
                    text: text.substring(0, 30) + (text.length > 30 ? '...' : '')
                });
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
            format,
            outputPath,
            total: items.length,
            success: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length,
            results,
            size,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Batch QR generation error: ${error.message}`);
    }
}

// Decode QR code (placeholder - would need qrcode reader library)
async function decodeQR(params) {
    const { imagePath } = params;

    if (!imagePath || !fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
    }

    // Note: Full decoding would require jsQR or similar library
    return {
        status: false,
        action: 'decode-qr',
        message: 'QR decoding requires additional library (jsQR/zxing)',
        recommendation: 'npm install jsqr jimp',
        imagePath,
        timestamp: new Date().toISOString()
    };
}
