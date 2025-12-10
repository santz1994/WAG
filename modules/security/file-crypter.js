// modules/security/file-crypter.js
// Encrypt/Decrypt files with military-grade AES-256-CTR + PBKDF2

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

module.exports = {
    name: "File Crypter (AES-256)",
    slug: "file-crypter",
    type: "api",
    version: "1.0.0",
    description: "Encrypt/Decrypt files with military-grade AES-256-CTR",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'encrypt':
                    return encryptFile(params);
                case 'decrypt':
                    return decryptFile(params);
                case 'generate-key':
                    return generateKeyFromPassword(params);
                case 'batch-encrypt':
                    return batchEncrypt(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function encryptFile({ filePath, password }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath is required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'File not found' };
        }

        if (!password) {
            return { success: false, error: 'Password is required' };
        }

        const fileData = fs.readFileSync(filePath);
        const salt = crypto.randomBytes(16);
        const iv = crypto.randomBytes(16);

        // PBKDF2 key derivation (256-bit key from password)
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

        // AES-256-CTR encryption
        const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
        const encrypted = Buffer.concat([cipher.update(fileData), cipher.final()]);

        // Build encrypted file: [salt (16)] [iv (16)] [encrypted data]
        const encryptedData = Buffer.concat([salt, iv, encrypted]);

        const encryptedPath = filePath + '.locked';
        fs.writeFileSync(encryptedPath, encryptedData);

        return {
            success: true,
            message: 'File encrypted successfully',
            originalFile: path.basename(filePath),
            encryptedFile: path.basename(encryptedPath),
            fileSize: fileData.length,
            encryptedSize: encryptedData.length,
            algorithm: 'AES-256-CTR',
            keyDerivation: 'PBKDF2 (100,000 iterations)'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function decryptFile({ filePath, password }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath is required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'File not found' };
        }

        if (!password) {
            return { success: false, error: 'Password is required' };
        }

        const encryptedData = fs.readFileSync(filePath);

        // Extract salt and IV from beginning of file
        if (encryptedData.length < 32) {
            return { success: false, error: 'Invalid encrypted file format' };
        }

        const salt = encryptedData.slice(0, 16);
        const iv = encryptedData.slice(16, 32);
        const encrypted = encryptedData.slice(32);

        // PBKDF2 key derivation using same salt
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

        try {
            const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

            // Remove .locked extension for output filename
            const originalPath = filePath.endsWith('.locked') 
                ? filePath.slice(0, -7) 
                : filePath + '.decrypted';

            fs.writeFileSync(originalPath, decrypted);

            return {
                success: true,
                message: 'File decrypted successfully',
                encryptedFile: path.basename(filePath),
                decryptedFile: path.basename(originalPath),
                fileSize: decrypted.length,
                algorithm: 'AES-256-CTR',
                keyDerivation: 'PBKDF2 (100,000 iterations)'
            };
        } catch (decryptError) {
            return { success: false, error: 'Incorrect password or corrupted file' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function generateKeyFromPassword({ password, salt = null }) {
    try {
        if (!password) {
            return { success: false, error: 'Password is required' };
        }

        const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
        const key = crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha256');

        return {
            success: true,
            algorithm: 'AES-256-CTR',
            keyDerivation: 'PBKDF2 (100,000 iterations)',
            keySize: 256,
            key: key.toString('hex'),
            salt: saltBuffer.toString('hex'),
            iterations: 100000,
            hashAlgorithm: 'sha256',
            recommendation: 'Use this key for manual encryption/decryption'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function batchEncrypt({ filePaths = [], password }) {
    try {
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            return { success: false, error: 'filePaths array is required and non-empty' };
        }

        if (!password) {
            return { success: false, error: 'Password is required' };
        }

        const results = [];
        let successful = 0;
        let failed = 0;

        filePaths.slice(0, 100).forEach(filePath => {
            try {
                if (fs.existsSync(filePath)) {
                    const result = encryptFile({ filePath, password });
                    if (result.success) {
                        results.push({ filePath, ...result });
                        successful++;
                    } else {
                        results.push({ filePath, ...result });
                        failed++;
                    }
                } else {
                    results.push({ 
                        filePath, 
                        success: false, 
                        error: 'File not found' 
                    });
                    failed++;
                }
            } catch (error) {
                results.push({ 
                    filePath, 
                    success: false, 
                    error: error.message 
                });
                failed++;
            }
        });

        return {
            success: true,
            message: `Batch encryption completed`,
            filesProcessed: filePaths.length,
            successful,
            failed,
            results
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
