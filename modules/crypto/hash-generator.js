// modules/crypto/hash-generator.js
// Hash Generator Tool - Generate hashes for text and files (MD5, SHA1, SHA256, SHA512, etc)

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "Hash Generator",
    slug: "hash-gen",
    type: "api",
    version: "1.0.0",
    description: "Generate various cryptographic hashes (MD5, SHA1, SHA256, SHA512, BLAKE2b, etc)",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'hash-text':
                    return hashText(params);
                case 'hash-file':
                    return hashFile(params);
                case 'hash-multiple':
                    return hashMultiple(params);
                case 'verify-hash':
                    return verifyHash(params);
                case 'generate-hmac':
                    return generateHmac(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Get available hash algorithms
function getAvailableAlgorithms() {
    // Returns common algorithms
    return {
        common: ['md5', 'sha1', 'sha256', 'sha512'],
        all: crypto.getHashes().filter(h => !h.includes('rsa') && !h.includes('dsa'))
    };
}

// Hash text with multiple algorithms
function hashText(params) {
    const {
        text,
        algorithms = ['sha256', 'md5'],
        encoding = 'hex' // hex, base64, base64url
    } = params;

    if (!text || typeof text !== 'string') {
        throw new Error('Text is required');
    }

    const results = {};
    const validAlgorithms = getAvailableAlgorithms().all;

    for (const algo of algorithms) {
        if (!validAlgorithms.includes(algo.toLowerCase())) {
            results[algo] = {
                error: `Algorithm not available: ${algo}`,
                available: validAlgorithms.slice(0, 10)
            };
            continue;
        }

        try {
            const hash = crypto
                .createHash(algo)
                .update(text)
                .digest(encoding);

            results[algo] = {
                value: hash,
                algorithm: algo,
                encoding,
                length: hash.length
            };
        } catch (error) {
            results[algo] = { error: error.message };
        }
    }

    return {
        status: true,
        action: 'hash-text',
        textLength: text.length,
        textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        algorithms: algorithms,
        encoding,
        hashes: results,
        timestamp: new Date().toISOString()
    };
}

// Hash file
function hashFile(params) {
    const {
        filePath,
        algorithms = ['sha256', 'md5']
    } = params;

    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileStats = fs.statSync(filePath);
        const results = {};
        const validAlgorithms = getAvailableAlgorithms().all;

        for (const algo of algorithms) {
            if (!validAlgorithms.includes(algo.toLowerCase())) {
                results[algo] = {
                    error: `Algorithm not available: ${algo}`
                };
                continue;
            }

            try {
                const hash = crypto
                    .createHash(algo)
                    .update(fileBuffer)
                    .digest('hex');

                results[algo] = {
                    value: hash,
                    algorithm: algo
                };
            } catch (error) {
                results[algo] = { error: error.message };
            }
        }

        return {
            status: true,
            action: 'hash-file',
            file: path.basename(filePath),
            filePath,
            fileSize: fileStats.size,
            fileSize_formatted: formatBytes(fileStats.size),
            modified: fileStats.mtime,
            algorithms,
            hashes: results,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`File hashing error: ${error.message}`);
    }
}

// Hash multiple files
function hashMultiple(params) {
    const {
        directory,
        algorithms = ['sha256'],
        recursive = false,
        filePattern = '*'
    } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found: ' + directory);
    }

    const results = [];

    try {
        const getFiles = (dir, pattern) => {
            let files = [];
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isFile()) {
                    // Simple pattern matching
                    if (filePattern === '*' || entry.name.includes(filePattern)) {
                        files.push(fullPath);
                    }
                } else if (entry.isDirectory() && recursive) {
                    files = files.concat(getFiles(fullPath, pattern));
                }
            }

            return files;
        };

        const files = getFiles(directory, filePattern);

        for (const file of files) {
            try {
                const fileBuffer = fs.readFileSync(file);
                const stats = fs.statSync(file);
                const hashes = {};

                for (const algo of algorithms) {
                    const hash = crypto
                        .createHash(algo)
                        .update(fileBuffer)
                        .digest('hex');
                    hashes[algo] = hash;
                }

                results.push({
                    file: path.basename(file),
                    path: file,
                    size: stats.size,
                    hashes,
                    modified: stats.mtime
                });
            } catch (error) {
                results.push({
                    file: path.basename(file),
                    path: file,
                    error: error.message
                });
            }
        }

        return {
            status: true,
            action: 'hash-multiple',
            directory,
            recursive,
            pattern: filePattern,
            filesFound: results.filter(r => !r.error).length,
            filesFailed: results.filter(r => r.error).length,
            algorithms,
            results,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Multi-file hashing error: ${error.message}`);
    }
}

// Verify hash (compare two hashes)
function verifyHash(params) {
    const {
        text,
        filePath,
        expectedHash,
        algorithm = 'sha256'
    } = params;

    let actualHash;

    try {
        if (text) {
            actualHash = crypto
                .createHash(algorithm)
                .update(text)
                .digest('hex');
        } else if (filePath && fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);
            actualHash = crypto
                .createHash(algorithm)
                .update(fileBuffer)
                .digest('hex');
        } else {
            throw new Error('Either text or filePath must be provided');
        }

        const isValid = actualHash.toLowerCase() === expectedHash.toLowerCase();

        return {
            status: true,
            action: 'verify-hash',
            algorithm,
            isValid,
            source: text ? 'text' : 'file',
            expectedHash: expectedHash.toLowerCase(),
            actualHash: actualHash.toLowerCase(),
            match: isValid ? '✓ VERIFIED' : '✗ MISMATCH',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Hash verification error: ${error.message}`);
    }
}

// Generate HMAC (Hash-based Message Authentication Code)
function generateHmac(params) {
    const {
        text,
        key,
        algorithm = 'sha256',
        encoding = 'hex'
    } = params;

    if (!text || !key) {
        throw new Error('Both text and key are required');
    }

    if (!crypto.getHashes().includes(algorithm)) {
        throw new Error(`Algorithm not available: ${algorithm}`);
    }

    try {
        const hmac = crypto
            .createHmac(algorithm, key)
            .update(text)
            .digest(encoding);

        return {
            status: true,
            action: 'generate-hmac',
            algorithm,
            encoding,
            textLength: text.length,
            keyLength: key.length,
            hmac,
            textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            keyPreview: key.substring(0, 10) + '*'.repeat(Math.max(0, key.length - 10)),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`HMAC generation error: ${error.message}`);
    }
}

// Helper: Format bytes for readability
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
