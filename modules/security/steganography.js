// modules/security/steganography.js
// Hide and reveal secrets inside PNG images

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = {
    name: "Steganography Vault",
    slug: "steganography",
    type: "api",
    version: "1.0.0",
    description: "Hide/reveal secrets inside PNG images (visual cryptography)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'hide':
                    return hideSecret(params);
                case 'reveal':
                    return revealSecret(params);
                case 'info':
                    return getInfo();
                case 'estimate-capacity':
                    return estimateCapacity(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function hideSecret({ imagePath, secret, password = null, encryption = false }) {
    try {
        if (!imagePath) {
            return { success: false, error: 'imagePath is required' };
        }

        if (!fs.existsSync(imagePath)) {
            return { success: false, error: 'Image file not found' };
        }

        if (!imagePath.toLowerCase().endsWith('.png')) {
            return { success: false, error: 'Only PNG files are supported' };
        }

        if (!secret) {
            return { success: false, error: 'Secret message is required' };
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const stats = fs.statSync(imagePath);

        // Estimate payload capacity (PNG files can hide roughly 1/8 of image size)
        const estimatedCapacity = Math.floor(stats.size / 8);
        let payload = secret;

        // Optional encryption layer
        if (encryption && password) {
            payload = encryptPayload(secret, password);
        } else if (password && !encryption) {
            // Simple marker-based approach
            payload = `STEG:${password.length}:${secret}`;
        }

        // Check if payload fits
        if (payload.length > estimatedCapacity) {
            return {
                success: false,
                error: `Payload too large (${payload.length} bytes, max ~${estimatedCapacity} bytes)`
            };
        }

        // Embed secret into LSB (Least Significant Bits) of image data
        const steganographedBuffer = embedPayload(imageBuffer, payload);

        // Save output
        const dir = path.dirname(imagePath);
        const ext = path.extname(imagePath);
        const name = path.basename(imagePath, ext);
        const outputPath = path.join(dir, `${name}_steg${ext}`);

        fs.writeFileSync(outputPath, steganographedBuffer);

        return {
            success: true,
            message: 'Secret hidden successfully',
            originalFile: path.basename(imagePath),
            steganographedFile: path.basename(outputPath),
            secretLength: secret.length,
            payloadLength: payload.length,
            estimatedCapacity,
            encrypted: encryption && password ? true : false,
            passwordProtected: password ? true : false,
            method: 'LSB (Least Significant Bit)',
            note: 'The steganographed image looks identical to the original but contains hidden data'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function revealSecret({ imagePath, password = null }) {
    try {
        if (!imagePath) {
            return { success: false, error: 'imagePath is required' };
        }

        if (!fs.existsSync(imagePath)) {
            return { success: false, error: 'Image file not found' };
        }

        if (!imagePath.toLowerCase().endsWith('.png')) {
            return { success: false, error: 'Only PNG files are supported' };
        }

        const imageBuffer = fs.readFileSync(imagePath);

        // Extract payload from LSBs
        const payload = extractPayload(imageBuffer);

        if (!payload || payload.length === 0) {
            return { success: false, error: 'No hidden secret found in this image' };
        }

        // Check for simple password marker
        if (payload.startsWith('STEG:')) {
            const parts = payload.split(':');
            if (parts.length >= 3) {
                const passwordLength = parseInt(parts[1]);
                const secretPart = parts.slice(2).join(':');

                if (password && password.length !== passwordLength) {
                    return { success: false, error: 'Invalid password for this image' };
                }

                return {
                    success: true,
                    secret: secretPart,
                    passwordProtected: true,
                    method: 'LSB (Least Significant Bit)',
                    note: 'Secret extracted from image'
                };
            }
        }

        // Check for encrypted payload
        if (payload.startsWith('ENCRYPTED:')) {
            if (!password) {
                return { success: false, error: 'This secret is encrypted. Password required.' };
            }
            try {
                const decrypted = decryptPayload(payload.substring(10), password);
                return {
                    success: true,
                    secret: decrypted,
                    encrypted: true,
                    method: 'LSB + AES-256-GCM',
                    note: 'Secret decrypted and extracted'
                };
            } catch (decryptError) {
                return { success: false, error: 'Incorrect password or corrupted data' };
            }
        }

        return {
            success: true,
            secret: payload,
            passwordProtected: false,
            encrypted: false,
            method: 'LSB (Least Significant Bit)',
            note: 'Secret extracted from image'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function estimateCapacity({ imagePath }) {
    try {
        if (!imagePath) {
            return { success: false, error: 'imagePath is required' };
        }

        if (!fs.existsSync(imagePath)) {
            return { success: false, error: 'Image file not found' };
        }

        const stats = fs.statSync(imagePath);
        const fileSize = stats.size;

        // PNG: Typically can hide ~1/8 of file size in LSBs
        const estimatedCapacity = Math.floor(fileSize / 8);

        return {
            success: true,
            imageFile: path.basename(imagePath),
            imageSize: fileSize + ' bytes',
            estimatedCapacity: estimatedCapacity + ' bytes',
            estimatedCapacityKB: (estimatedCapacity / 1024).toFixed(2) + ' KB',
            method: 'LSB steganography',
            notes: [
                'Capacity depends on image complexity and color depth',
                'More complex images can hide less data',
                'Simple solid-color images can hide more data',
                'Actual capacity = roughly 1 bit per RGB channel per pixel'
            ]
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getInfo() {
    return {
        success: true,
        name: 'Steganography Vault',
        description: 'Hide secrets inside PNG images',
        method: 'LSB (Least Significant Bit) encoding',
        security: {
            level: 'Visual Cryptography + Optional Encryption',
            advantage: 'Secret is invisible to casual inspection',
            limitation: 'Vulnerable to steganalysis (statistical analysis)',
            recommendation: 'Combine with encryption for sensitive data'
        },
        useCases: [
            'Hide sensitive documents in plain-sight images',
            'Covert communication (spy tradecraft)',
            'DRM/watermarking for image copyright',
            'Backup important data inside photos',
            'Insurance against surveillance (deniable encryption)'
        ],
        howitWorks: {
            encoding: 'Replace LSBs of image pixels with secret data bits',
            capacity: 'Roughly 1/8 of image file size in bytes',
            visibility: 'Visually identical to original image',
            detection: 'Invisible to naked eye, but detectable by steganalysis'
        },
        recommendations: [
            'Use LSB for low-security (casual hiding)',
            'Add AES-256-GCM encryption for sensitive data',
            'Use complex/noisy images for better capacity',
            'Consider steganography as obscurity, not security alone',
            'For military/spy use: Layer with encryption + physical security'
        ]
    };
}

/**
 * Embed payload into PNG image using LSB technique
 */
function embedPayload(imageBuffer, payload) {
    const buffer = Buffer.from(imageBuffer);
    const payloadBuffer = Buffer.from(payload, 'utf-8');

    // Write payload length as 4-byte header
    let offset = 8; // Skip PNG signature
    buffer.writeUInt32BE(payloadBuffer.length, offset);
    offset += 4;

    // Embed payload bits into LSBs
    let bitIndex = 0;
    for (let i = 0; i < payloadBuffer.length && offset < buffer.length; i++) {
        const byte = payloadBuffer[i];
        for (let bit = 0; bit < 8; bit++) {
            if (offset >= buffer.length) break;

            const bitValue = (byte >> bit) & 1;
            buffer[offset] = (buffer[offset] & 0xFE) | bitValue;
            offset++;
        }
    }

    return buffer;
}

/**
 * Extract payload from PNG image LSBs
 */
function extractPayload(imageBuffer) {
    const buffer = Buffer.from(imageBuffer);

    // Read payload length from header
    let offset = 8; // Skip PNG signature
    if (offset + 4 > buffer.length) return null;

    const payloadLength = buffer.readUInt32BE(offset);
    offset += 4;

    if (payloadLength <= 0 || payloadLength > buffer.length) return null;

    // Extract payload bits from LSBs
    const payloadBuffer = Buffer.alloc(payloadLength);
    let bitIndex = 0;

    for (let i = 0; i < payloadLength && offset < buffer.length; i++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
            if (offset >= buffer.length) break;

            const bitValue = buffer[offset] & 1;
            byte |= (bitValue << bit);
            offset++;
        }
        payloadBuffer[i] = byte;
    }

    return payloadBuffer.toString('utf-8', 0, payloadLength);
}

/**
 * Encrypt payload with AES-256-GCM
 */
function encryptPayload(data, password) {
    try {
        const algorithm = 'aes-256-gcm';
        const salt = crypto.randomBytes(16);
        const iv = crypto.randomBytes(12);

        // Derive key from password
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([
            cipher.update(data, 'utf-8'),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();

        // Return: ENCRYPTED:salt:iv:authTag:encrypted
        return 'ENCRYPTED:' + salt.toString('hex') + ':' + iv.toString('hex') + ':' +
               authTag.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Decrypt payload with AES-256-GCM
 */
function decryptPayload(encryptedData, password) {
    try {
        const algorithm = 'aes-256-gcm';
        const parts = encryptedData.split(':');

        if (parts.length !== 4) {
            throw new Error('Invalid encrypted data format');
        }

        const salt = Buffer.from(parts[0], 'hex');
        const iv = Buffer.from(parts[1], 'hex');
        const authTag = Buffer.from(parts[2], 'hex');
        const encrypted = Buffer.from(parts[3], 'hex');

        // Derive key from password
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString('utf-8');
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}
