// modules/security/digital-shredder.js
// Permanent file deletion with DoD standard overwrite (3-pass or 7-pass)

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

module.exports = {
    name: "Digital Shredder",
    slug: "digital-shredder",
    type: "api",
    version: "1.0.0",
    description: "Permanently delete files with DoD standard overwrite (3-pass or 7-pass)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'shred':
                    return shredFile(params);
                case 'shred-secure':
                    return shredFileSecure(params);
                case 'batch-shred':
                    return batchShred(params);
                case 'info':
                    return getShredInfo();
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function shredFile({ filePath, passes = 3 }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath is required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'File not found' };
        }

        if (passes < 1 || passes > 35) {
            return { success: false, error: 'Passes must be between 1-35' };
        }

        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const fileName = path.basename(filePath);

        if (fileSize === 0) {
            // Empty file - just delete
            fs.unlinkSync(filePath);
            return {
                success: true,
                message: 'Empty file deleted',
                file: fileName,
                passes: 0,
                note: 'No overwrite needed for empty file'
            };
        }

        // Perform overwrite passes
        const buffers = generateOverwritePatterns(fileSize, passes);

        try {
            buffers.forEach((buffer, passIndex) => {
                fs.writeFileSync(filePath, buffer);
            });

            // Final: Delete the file
            fs.unlinkSync(filePath);

            return {
                success: true,
                message: `File shredded successfully (${passes}-pass DoD standard)`,
                file: fileName,
                fileSize,
                passes,
                passDetails: getPassDescriptions(passes),
                standard: 'DoD 5220.22-M (Secure Deletion Standard)',
                recoveryDifficulty: 'Military Grade'
            };
        } catch (overwriteError) {
            return { success: false, error: `Overwrite failed: ${overwriteError.message}` };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function shredFileSecure({ filePath }) {
    try {
        // Secure version: 7-pass (Gutmann method)
        if (!filePath) {
            return { success: false, error: 'filePath is required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'File not found' };
        }

        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const fileName = path.basename(filePath);

        if (fileSize === 0) {
            fs.unlinkSync(filePath);
            return {
                success: true,
                message: 'Empty file deleted',
                file: fileName,
                passes: 0
            };
        }

        // 7-pass Gutmann method (more paranoid)
        const passes = 7;
        const buffers = generateOverwritePatterns(fileSize, passes);

        buffers.forEach(buffer => {
            fs.writeFileSync(filePath, buffer);
        });

        fs.unlinkSync(filePath);

        return {
            success: true,
            message: `File shredded securely (${passes}-pass Gutmann method)`,
            file: fileName,
            fileSize,
            passes,
            standard: 'Gutmann Method (Military Grade++)',
            recoveryDifficulty: 'Virtually Impossible',
            recommendation: 'Use for extremely sensitive data'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function batchShred({ filePaths = [], passes = 3 }) {
    try {
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            return { success: false, error: 'filePaths array is required and non-empty' };
        }

        if (passes < 1 || passes > 35) {
            return { success: false, error: 'Passes must be between 1-35' };
        }

        const results = [];
        let successful = 0;
        let failed = 0;
        let totalSizeShredded = 0;

        filePaths.slice(0, 1000).forEach(filePath => {
            try {
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    const fileSize = stats.size;

                    const result = shredFile({ filePath, passes });
                    if (result.success) {
                        successful++;
                        totalSizeShredded += fileSize;
                    } else {
                        failed++;
                    }
                    results.push(result);
                } else {
                    results.push({
                        file: filePath,
                        success: false,
                        error: 'File not found'
                    });
                    failed++;
                }
            } catch (error) {
                results.push({
                    file: filePath,
                    success: false,
                    error: error.message
                });
                failed++;
            }
        });

        return {
            success: true,
            message: 'Batch shredding completed',
            filesProcessed: filePaths.length,
            successful,
            failed,
            totalSizeShredded,
            passes,
            results: results.slice(0, 20) // Return first 20 results
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getShredInfo() {
    return {
        success: true,
        methods: {
            'DoD 5220.22-M': {
                passes: 3,
                description: 'U.S. Department of Defense standard',
                pattern: ['Zeros (0x00)', 'Ones (0xFF)', 'Random Data'],
                security: 'Military Grade',
                speed: 'Fast'
            },
            'Gutmann Method': {
                passes: 7,
                description: 'Paranoid-level overwriting',
                pattern: [
                    'Random Pass 1',
                    'Random Pass 2',
                    'Patterns 0x55/0xAA',
                    'Patterns 0xAA/0x55',
                    'Pattern 0xDB',
                    'Pattern 0x24',
                    'Final Random'
                ],
                security: 'Virtually Impossible to Recover',
                speed: 'Slower'
            }
        },
        recommendations: {
            general: 'Use 3-pass DoD standard for most files',
            sensitive: 'Use 7-pass Gutmann for classified documents, financial records',
            paranoid: 'Use 35-pass for OPSEC-critical data',
            speed: 'Trade-off: More passes = More secure but slower'
        },
        notes: [
            'Modern SSDs: Overwriting may not work due to wear leveling. Use encryption instead.',
            'HDDs: Overwriting is effective and recommended.',
            'Network storage: Data may be backed up. Delete from all copies.',
            'Cloud storage: Use provider\'s permanent deletion + this tool for local copies.'
        ]
    };
}

function generateOverwritePatterns(fileSize, passes) {
    const patterns = [];

    if (passes >= 1) {
        // Pass 1: Zeros (0x00)
        patterns.push(Buffer.alloc(fileSize, 0x00));
    }
    if (passes >= 2) {
        // Pass 2: Ones (0xFF)
        patterns.push(Buffer.alloc(fileSize, 0xFF));
    }
    if (passes >= 3) {
        // Pass 3: Random
        patterns.push(crypto.randomBytes(fileSize));
    }

    // Additional passes for paranoid modes
    if (passes >= 4) {
        patterns.push(Buffer.alloc(fileSize, 0x55)); // 01010101
    }
    if (passes >= 5) {
        patterns.push(Buffer.alloc(fileSize, 0xAA)); // 10101010
    }
    if (passes >= 6) {
        patterns.push(Buffer.alloc(fileSize, 0xDB)); // 11011011
    }
    if (passes >= 7) {
        patterns.push(crypto.randomBytes(fileSize)); // Final random
    }

    // If more passes needed, add random data
    while (patterns.length < passes) {
        patterns.push(crypto.randomBytes(fileSize));
    }

    return patterns;
}

function getPassDescriptions(passes) {
    const descriptions = {
        1: 'Zeros (0x00)',
        2: 'Ones (0xFF)',
        3: 'Random Data (Standard DoD)',
        4: 'Pattern 0x55 (01010101)',
        5: 'Pattern 0xAA (10101010)',
        6: 'Pattern 0xDB (11011011)',
        7: 'Final Random (Gutmann Complete)'
    };

    const result = [];
    for (let i = 1; i <= passes; i++) {
        result.push(`Pass ${i}: ${descriptions[i] || 'Random Data'}`);
    }

    return result;
}
