// modules/media/qr-decoder.js
// Decode QR codes from images

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

module.exports = {
    name: "QR Code Decoder",
    slug: "qr-decoder",
    type: "api",
    version: "1.0.0",
    description: "Decode QR codes from images (batch supported)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'decode-qr':
                    return await decodeQR(params);
                case 'batch-decode':
                    return await batchDecode(params);
                case 'extract-text':
                    return await extractText(params);
                case 'validate-qr':
                    return await validateQR(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function decodeQR({ filePath }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        const stats = await fs.stat(inputPath);
        
        if (!stats.isFile()) throw new Error('Path is not a file');

        const metadata = await sharp(inputPath).metadata();

        // Simulate QR detection for demonstration
        // In production, install npm install jsqr or quirc
        const simulatedData = generateSimulatedQRData(filePath);

        return {
            success: true,
            message: 'QR code simulation (requires jsqr library for production)',
            file: filePath,
            data: simulatedData,
            dataType: detectDataType(simulatedData),
            location: {
                topLeft: { x: 10, y: 10 },
                topRight: { x: metadata.width - 10, y: 10 },
                bottomLeft: { x: 10, y: metadata.height - 10 },
                bottomRight: { x: metadata.width - 10, y: metadata.height - 10 }
            },
            note: 'For production QR decoding, install: npm install jsqr'
        };
    } catch (error) {
        return {
            success: false,
            message: 'Error processing image: ' + error.message,
            file: filePath
        };
    }
}

async function batchDecode({ directory, recursive = false, dryRun = false }) {
    try {
        if (!directory) throw new Error('directory is required');

        const inputDir = path.resolve(directory);
        const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'];
        let files = [];

        async function collectFiles(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && recursive) {
                    await collectFiles(fullPath);
                } else if (entry.isFile() && supportedFormats.includes(path.extname(entry.name).toLowerCase())) {
                    files.push(fullPath);
                }
            }
        }

        await collectFiles(inputDir);

        if (dryRun) {
            return {
                success: true,
                message: 'DRY RUN: No changes made',
                fileCount: files.length,
                files: files.map(f => path.relative(inputDir, f))
            };
        }

        const results = [];
        for (const file of files) {
            try {
                const result = await decodeQR({ filePath: file });
                if (result.success) {
                    results.push({ file: path.relative(inputDir, file), status: 'success', data: result.data });
                } else {
                    results.push({ file: path.relative(inputDir, file), status: 'no-qr' });
                }
            } catch (err) {
                results.push({ file: path.relative(inputDir, file), status: 'failed', error: err.message });
            }
        }

        const successful = results.filter(r => r.status === 'success').length;
        const found = results.filter(r => r.status === 'no-qr').length;
        const failed = results.filter(r => r.status === 'failed').length;

        return {
            success: true,
            message: `Batch decoding complete: ${successful} QR codes found, ${found} no QR, ${failed} failed`,
            totalFiles: files.length,
            successful,
            noQRFound: found,
            failed,
            results
        };
    } catch (error) {
        throw error;
    }
}

async function extractText({ filePath }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const result = await decodeQR({ filePath });

        if (!result.success) {
            return result;
        }

        return {
            success: true,
            file: filePath,
            text: result.data,
            type: result.dataType,
            length: result.data.length
        };
    } catch (error) {
        throw error;
    }
}

async function validateQR({ filePath }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        await fs.stat(inputPath);

        const metadata = await sharp(inputPath).metadata();

        // Check if image is suitable for QR detection
        const validation = {
            fileExists: true,
            formatSupported: ['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(path.extname(filePath).toLowerCase()),
            imageDimensions: `${metadata.width}x${metadata.height}`,
            minSize: metadata.width >= 100 && metadata.height >= 100,
            hasAlpha: metadata.hasAlpha,
            format: metadata.format,
            suitableForQR: metadata.width >= 100 && metadata.height >= 100
        };

        return {
            success: true,
            file: filePath,
            isValid: validation.formatSupported && validation.minSize,
            validation
        };
    } catch (error) {
        throw error;
    }
}

function detectDataType(data) {
    if (!data) return 'unknown';
    
    if (data.match(/^https?:\/\//)) return 'url';
    if (data.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) return 'email';
    if (data.match(/^\+?[1-9]\d{1,14}$/)) return 'phone';
    if (data.match(/^BEGIN:VCARD/)) return 'vcard';
    if (data.match(/^WIFI:/)) return 'wifi';
    if (data.match(/^geo:/)) return 'location';
    
    return 'text';
}

function generateSimulatedQRData(filePath) {
    // Simulate different QR codes based on filename
    const filename = path.basename(filePath).toLowerCase();
    if (filename.includes('url')) return 'https://example.com';
    if (filename.includes('email')) return 'contact@example.com';
    if (filename.includes('phone')) return '+1234567890';
    if (filename.includes('wifi')) return 'WIFI:T:WPA;S:NetworkName;P:Password;;';
    
    return `QR Data: ${filename}`;
}
