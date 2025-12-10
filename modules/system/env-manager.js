// modules/system/env-manager.js
// Encrypt and decrypt .env files for secure sharing

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = {
    name: "Environment Manager",
    slug: "env-manager",
    type: "api",
    version: "1.0.0",
    description: "Encrypt/decrypt .env files securely",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'encrypt':
                    return await encryptEnvFile(params);
                case 'decrypt':
                    return await decryptEnvFile(params);
                case 'verify':
                    return verifyEnvFile(params);
                case 'list-vars':
                    return listEnvironmentVariables(params);
                case 'export':
                    return exportEnvironment(params);
                case 'encrypt-value':
                    return encryptValue(params);
                case 'decrypt-value':
                    return decryptValue(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function encryptEnvFile({ filePath, password, output = null, algorithm = 'aes-256-gcm' }) {
    try {
        if (!filePath || !password) {
            return { success: false, error: 'filePath and password required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const outputPath = output || `${filePath}.enc`;

        // Generate key from password using PBKDF2
        const salt = crypto.randomBytes(32);
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

        // Generate IV and auth tag
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);

        // Encrypt content
        let encrypted = cipher.update(content, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        // Combine salt + IV + authTag + encrypted content
        const result = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')]);
        fs.writeFileSync(outputPath, result);

        const stats = fs.statSync(filePath);
        const encStats = fs.statSync(outputPath);

        return {
            success: true,
            filePath,
            output: outputPath,
            algorithm,
            originalSize: `${(stats.size / 1024).toFixed(2)} KB`,
            encryptedSize: `${(encStats.size / 1024).toFixed(2)} KB`,
            compressionRatio: `${(100 - (encStats.size / stats.size * 100)).toFixed(2)}%`,
            variablesCount: content.split('\n').filter(line => line.includes('=')).length,
            message: `Encrypted ${path.basename(filePath)} to ${path.basename(outputPath)}`,
            warning: 'Keep your password safe! You will need it to decrypt.'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function decryptEnvFile({ filePath, password, output = null }) {
    try {
        if (!filePath || !password) {
            return { success: false, error: 'filePath and password required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const encrypted = fs.readFileSync(filePath);

        // Extract salt (first 32 bytes)
        const salt = encrypted.slice(0, 32);
        // Extract IV (next 16 bytes)
        const iv = encrypted.slice(32, 48);
        // Extract auth tag (next 16 bytes)
        const authTag = encrypted.slice(48, 64);
        // Rest is encrypted content
        const encryptedContent = encrypted.slice(64);

        // Regenerate key from password and salt
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

        // Decrypt
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedContent, 'binary', 'utf8');
        decrypted += decipher.final('utf8');

        const outputPath = output || filePath.replace(/\.enc$/, '.env');
        fs.writeFileSync(outputPath, decrypted);

        const variablesCount = decrypted.split('\n').filter(line => line.includes('=')).length;

        return {
            success: true,
            encrypted: filePath,
            output: outputPath,
            variablesCount,
            message: `Decrypted ${path.basename(filePath)} to ${path.basename(outputPath)}`,
            warning: 'Keep the decrypted file secure and never commit to git!'
        };
    } catch (error) {
        if (error.message.includes('Unsupported state or unable to authenticate data')) {
            return { success: false, error: 'Invalid password or corrupted file' };
        }
        return { success: false, error: error.message };
    }
}

function verifyEnvFile({ filePath }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const variables = [];
        const issues = [];

        lines.forEach((line, idx) => {
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('#')) {
                return; // Skip comments and empty lines
            }

            if (!trimmed.includes('=')) {
                issues.push({
                    line: idx + 1,
                    issue: 'Invalid format (missing =)',
                    content: trimmed.substring(0, 50)
                });
                return;
            }

            const [key, value] = trimmed.split('=');

            if (!key || !key.trim()) {
                issues.push({
                    line: idx + 1,
                    issue: 'Empty variable name',
                    content: trimmed
                });
                return;
            }

            variables.push({
                name: key.trim(),
                hasValue: !!value && value.trim().length > 0,
                valueLength: value ? value.length : 0
            });
        });

        const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'API_KEY', 'DATABASE_URL'];
        const sensitiveVars = variables.filter(v => 
            sensitiveKeys.some(sensitive => v.name.includes(sensitive))
        );

        return {
            success: true,
            filePath: path.basename(filePath),
            summary: {
                totalLines: lines.length,
                totalVariables: variables.length,
                emptyVariables: variables.filter(v => !v.hasValue).length,
                sensitiveVariables: sensitiveVars.length,
                issues: issues.length
            },
            variables: variables.slice(0, 50),
            sensitiveVariables: sensitiveVars,
            issues: issues.slice(0, 20),
            status: issues.length === 0 ? 'Valid' : 'Has issues'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function listEnvironmentVariables({ filePath }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const variables = {};

        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, value] = trimmed.split('=');
                if (key) {
                    variables[key.trim()] = {
                        value: value ? value.substring(0, 20) + (value.length > 20 ? '...' : '') : '',
                        length: value ? value.length : 0
                    };
                }
            }
        });

        return {
            success: true,
            filePath: path.basename(filePath),
            count: Object.keys(variables).length,
            variables
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function exportEnvironment({ filePath, format = 'json' }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const variables = {};

        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, value] = trimmed.split('=');
                if (key) {
                    variables[key.trim()] = value ? value.trim() : '';
                }
            }
        });

        let exported;
        if (format === 'json') {
            exported = JSON.stringify(variables, null, 2);
        } else if (format === 'docker') {
            exported = Object.entries(variables)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');
        } else if (format === 'yaml') {
            exported = Object.entries(variables)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
        } else {
            return { success: false, error: `Unsupported format: ${format}` };
        }

        return {
            success: true,
            filePath: path.basename(filePath),
            format,
            variablesCount: Object.keys(variables).length,
            export: exported
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function encryptValue({ value, password }) {
    try {
        if (!value || !password) {
            return { success: false, error: 'value and password required' };
        }

        const salt = crypto.randomBytes(32);
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        const result = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')]).toString('hex');

        return {
            success: true,
            encrypted: result,
            message: 'Value encrypted successfully',
            note: 'Store this encrypted value in your env file'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function decryptValue({ encrypted, password }) {
    try {
        if (!encrypted || !password) {
            return { success: false, error: 'encrypted and password required' };
        }

        const buffer = Buffer.from(encrypted, 'hex');
        const salt = buffer.slice(0, 32);
        const iv = buffer.slice(32, 48);
        const authTag = buffer.slice(48, 64);
        const encryptedContent = buffer.slice(64);

        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedContent, 'binary', 'utf8');
        decrypted += decipher.final('utf8');

        return {
            success: true,
            value: decrypted,
            message: 'Value decrypted successfully'
        };
    } catch (error) {
        return { success: false, error: 'Invalid encrypted value or password' };
    }
}
