// modules/file/duplicate-finder.js
// Duplicate File Finder - Find, report, and remove duplicate files by hash

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "Duplicate Finder",
    slug: "duplicate-finder",
    type: "api",
    version: "1.0.0",
    description: "Find duplicate files by hash, remove or move duplicates",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'find-duplicates':
                    return await findDuplicates(params);
                case 'remove-duplicates':
                    return await removeDuplicates(params);
                case 'move-duplicates':
                    return await moveDuplicates(params);
                case 'scan-directory':
                    return await scanDirectory(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Helper: Calculate file hash
function calculateHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

// Find duplicate files in directory
async function findDuplicates(params) {
    const { directory, recursive = true, sizeThreshold = 0 } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    try {
        const hashes = new Map();
        const duplicates = [];
        let totalFiles = 0;
        let totalSize = 0;

        // Recursively get all files
        const getFiles = (dir) => {
            let files = [];
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isFile()) {
                    const fileSize = fs.statSync(fullPath).size;
                    if (fileSize >= sizeThreshold) {
                        files.push(fullPath);
                    }
                } else if (entry.isDirectory() && recursive) {
                    files = files.concat(getFiles(fullPath));
                }
            }

            return files;
        };

        const files = getFiles(directory);

        // Calculate hashes and find duplicates
        for (const file of files) {
            try {
                totalFiles++;
                const stats = fs.statSync(file);
                totalSize += stats.size;

                const hash = calculateHash(file);

                if (hashes.has(hash)) {
                    // Found duplicate
                    const original = hashes.get(hash);
                    if (!duplicates.find(d => d.hash === hash)) {
                        duplicates.push({
                            hash,
                            count: 2,
                            size: stats.size,
                            original,
                            duplicates: [file]
                        });
                    } else {
                        const dupEntry = duplicates.find(d => d.hash === hash);
                        dupEntry.count++;
                        dupEntry.duplicates.push(file);
                    }
                } else {
                    hashes.set(hash, file);
                }
            } catch (error) {
                console.error(`Error hashing ${file}: ${error.message}`);
            }
        }

        const totalDuplicateSize = duplicates.reduce((sum, d) => sum + (d.size * (d.count - 1)), 0);

        return {
            status: true,
            action: 'find-duplicates',
            directory,
            recursive,
            totalFiles,
            totalSize,
            duplicateGroups: duplicates.length,
            duplicateCount: duplicates.reduce((sum, d) => sum + (d.count - 1), 0),
            totalDuplicateSize,
            potentialSavings: (totalDuplicateSize / 1024 / 1024).toFixed(2) + ' MB',
            duplicates: duplicates.map(d => ({
                hash: d.hash.substring(0, 8) + '...',
                fileSize: d.size,
                count: d.count,
                original: path.basename(d.original),
                duplicates: d.duplicates.map(f => path.basename(f))
            })),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Duplicate scan error: ${error.message}`);
    }
}

// Remove duplicate files (keep original)
async function removeDuplicates(params) {
    const { directory, recursive = true, dryRun = true } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    try {
        const hashes = new Map();
        const removed = [];
        let totalFreed = 0;

        // Recursively get all files
        const getFiles = (dir) => {
            let files = [];
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isFile()) {
                    files.push(fullPath);
                } else if (entry.isDirectory() && recursive) {
                    files = files.concat(getFiles(fullPath));
                }
            }

            return files;
        };

        const files = getFiles(directory);

        // Remove duplicates, keeping first occurrence
        for (const file of files) {
            try {
                const hash = calculateHash(file);
                const stats = fs.statSync(file);

                if (hashes.has(hash)) {
                    // This is a duplicate
                    if (!dryRun) {
                        fs.unlinkSync(file);
                    }

                    totalFreed += stats.size;
                    removed.push({
                        file: path.basename(file),
                        path: file,
                        size: stats.size,
                        kept: hashes.get(hash),
                        status: dryRun ? 'preview' : 'deleted'
                    });
                } else {
                    hashes.set(hash, file);
                }
            } catch (error) {
                removed.push({
                    file: path.basename(file),
                    path: file,
                    error: error.message,
                    status: 'failed'
                });
            }
        }

        return {
            status: true,
            action: 'remove-duplicates',
            directory,
            dryRun,
            filesRemoved: removed.filter(r => r.status !== 'failed').length,
            filesFailed: removed.filter(r => r.status === 'failed').length,
            totalFreed,
            spaceFreed: (totalFreed / 1024 / 1024).toFixed(2) + ' MB',
            removed: removed.slice(0, 50), // Show first 50
            note: dryRun ? 'Preview only. Set dryRun: false to delete files' : 'Duplicates deleted',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Duplicate removal error: ${error.message}`);
    }
}

// Move duplicate files to directory
async function moveDuplicates(params) {
    const { directory, targetDirectory, recursive = true, dryRun = true } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    if (!targetDirectory) {
        throw new Error('targetDirectory is required');
    }

    try {
        fs.mkdirSync(targetDirectory, { recursive: true });

        const hashes = new Map();
        const moved = [];
        let totalMoved = 0;

        // Recursively get all files
        const getFiles = (dir) => {
            let files = [];
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isFile()) {
                    files.push(fullPath);
                } else if (entry.isDirectory() && recursive) {
                    files = files.concat(getFiles(fullPath));
                }
            }

            return files;
        };

        const files = getFiles(directory);

        // Move duplicates
        for (const file of files) {
            try {
                const hash = calculateHash(file);
                const stats = fs.statSync(file);

                if (hashes.has(hash)) {
                    // This is a duplicate
                    const targetFile = path.join(targetDirectory, path.basename(file));

                    if (!dryRun && !fs.existsSync(targetFile)) {
                        fs.copyFileSync(file, targetFile);
                        fs.unlinkSync(file);
                    }

                    totalMoved += stats.size;
                    moved.push({
                        file: path.basename(file),
                        fromPath: file,
                        toPath: targetFile,
                        size: stats.size,
                        status: dryRun ? 'preview' : 'moved'
                    });
                } else {
                    hashes.set(hash, file);
                }
            } catch (error) {
                moved.push({
                    file: path.basename(file),
                    error: error.message,
                    status: 'failed'
                });
            }
        }

        return {
            status: true,
            action: 'move-duplicates',
            fromDirectory: directory,
            toDirectory: targetDirectory,
            dryRun,
            filesMoved: moved.filter(m => m.status !== 'failed').length,
            filesFailed: moved.filter(m => m.status === 'failed').length,
            totalMoved,
            spaceMoved: (totalMoved / 1024 / 1024).toFixed(2) + ' MB',
            moved: moved.slice(0, 50),
            note: dryRun ? 'Preview only. Set dryRun: false to move files' : 'Duplicates moved',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Duplicate move error: ${error.message}`);
    }
}

// Scan directory and get statistics
async function scanDirectory(params) {
    const { directory, recursive = true } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    try {
        let totalFiles = 0;
        let totalSize = 0;
        const fileTypes = {};

        // Recursively scan all files
        const scanFiles = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isFile()) {
                    totalFiles++;
                    const stats = fs.statSync(fullPath);
                    totalSize += stats.size;

                    const ext = path.extname(entry.name).toLowerCase() || 'no-extension';
                    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
                } else if (entry.isDirectory() && recursive) {
                    scanFiles(fullPath);
                }
            }
        };

        scanFiles(directory);

        return {
            status: true,
            action: 'scan-directory',
            directory,
            recursive,
            totalFiles,
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            fileTypes: Object.entries(fileTypes)
                .sort((a, b) => b[1] - a[1])
                .reduce((acc, [ext, count]) => {
                    acc[ext] = count;
                    return acc;
                }, {}),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Directory scan error: ${error.message}`);
    }
}
