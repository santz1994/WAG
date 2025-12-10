// modules/system/file-manager.js
// Bulk file operations: rename, duplicate finder, disk usage analysis

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = {
    name: "Bulk File Manager",
    slug: "file-manager",
    type: "api",
    version: "1.0.0",
    description: "Bulk rename, find duplicates, analyze disk usage",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'bulk-rename':
                    return await bulkRename(params);
                case 'find-duplicates':
                    return await findDuplicates(params);
                case 'analyze-usage':
                    return await analyzeDiskUsage(params);
                case 'list-files':
                    return await listFiles(params);
                case 'search-files':
                    return await searchFiles(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function bulkRename({ dirPath, pattern, replacement, dryRun = true }) {
    try {
        if (!dirPath || !pattern || !replacement === undefined) {
            return { success: false, error: 'dirPath, pattern, and replacement required' };
        }

        if (!fs.existsSync(dirPath)) {
            return { success: false, error: `Directory not found: ${dirPath}` };
        }

        const files = fs.readdirSync(dirPath);
        const renamedFiles = [];
        const skipped = [];

        files.forEach(file => {
            try {
                if (file.includes(pattern)) {
                    const newName = file.replace(new RegExp(pattern, 'g'), replacement);
                    const oldPath = path.join(dirPath, file);
                    const newPath = path.join(dirPath, newName);

                    if (!dryRun && fs.statSync(oldPath).isFile()) {
                        fs.renameSync(oldPath, newPath);
                    }

                    renamedFiles.push({
                        oldName: file,
                        newName,
                        status: 'success'
                    });
                } else {
                    skipped.push(file);
                }
            } catch (error) {
                renamedFiles.push({
                    oldName: file,
                    error: error.message
                });
            }
        });

        return {
            success: true,
            directory: dirPath,
            pattern,
            replacement,
            dryRun,
            renamed: renamedFiles.length,
            skipped: skipped.length,
            renamedFiles: renamedFiles.filter(f => f.status === 'success'),
            totalFiles: files.length,
            message: dryRun ? 'Dry run completed. No files were actually renamed.' : `Renamed ${renamedFiles.length} files`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function findDuplicates({ dirPath, recursive = false }) {
    try {
        if (!dirPath) {
            return { success: false, error: 'dirPath is required' };
        }

        if (!fs.existsSync(dirPath)) {
            return { success: false, error: `Directory not found: ${dirPath}` };
        }

        const hashes = {};
        const duplicates = [];
        let totalFiles = 0;
        let totalSize = 0;

        function scanDirectory(dir) {
            const files = fs.readdirSync(dir);

            files.forEach(file => {
                try {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);

                    if (stat.isFile()) {
                        totalFiles++;
                        totalSize += stat.size;

                        // Skip very large files (> 1GB)
                        if (stat.size > 1024 * 1024 * 1024) {
                            return;
                        }

                        const buffer = fs.readFileSync(filePath);
                        const hash = crypto.createHash('md5').update(buffer).digest('hex');

                        if (hashes[hash]) {
                            // Duplicate found
                            duplicates.push({
                                hash,
                                original: hashes[hash],
                                duplicate: filePath,
                                size: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
                                sizeBytes: stat.size
                            });
                        } else {
                            hashes[hash] = filePath;
                        }
                    } else if (stat.isDirectory() && recursive) {
                        scanDirectory(filePath);
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            });
        }

        scanDirectory(dirPath);

        // Sort duplicates by size (largest first)
        duplicates.sort((a, b) => b.sizeBytes - a.sizeBytes);

        const potentialSavings = duplicates.reduce((sum, d) => sum + d.sizeBytes, 0);

        return {
            success: true,
            directory: dirPath,
            recursive,
            summary: {
                totalFiles,
                totalSize: `${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`,
                duplicatesFound: duplicates.length,
                potentialSavings: `${(potentialSavings / 1024 / 1024).toFixed(2)} MB`
            },
            duplicates: duplicates.slice(0, 100),
            message: duplicates.length > 0 ? `Found ${duplicates.length} duplicate files` : 'No duplicates found'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function analyzeDiskUsage({ dirPath, depth = 2 }) {
    try {
        if (!dirPath) {
            return { success: false, error: 'dirPath is required' };
        }

        if (!fs.existsSync(dirPath)) {
            return { success: false, error: `Directory not found: ${dirPath}` };
        }

        const usage = {};
        let totalSize = 0;

        function scanDirectory(dir, currentDepth = 0) {
            if (currentDepth > depth) return;

            try {
                const files = fs.readdirSync(dir);

                files.forEach(file => {
                    try {
                        const filePath = path.join(dir, file);
                        const stat = fs.statSync(filePath);

                        if (stat.isFile()) {
                            totalSize += stat.size;
                            usage[filePath] = stat.size;
                        } else if (stat.isDirectory() && currentDepth < depth) {
                            scanDirectory(filePath, currentDepth + 1);
                        }
                    } catch (error) {
                        // Skip files that can't be accessed
                    }
                });
            } catch (error) {
                // Skip directories that can't be read
            }
        }

        scanDirectory(dirPath);

        // Sort by size
        const sorted = Object.entries(usage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([file, size]) => ({
                file,
                size: `${(size / 1024 / 1024).toFixed(2)} MB`,
                sizeBytes: size
            }));

        return {
            success: true,
            directory: dirPath,
            depth,
            summary: {
                totalSize: `${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`,
                totalFiles: Object.keys(usage).length,
                averageFileSize: `${(totalSize / Math.max(Object.keys(usage).length, 1) / 1024 / 1024).toFixed(2)} MB`
            },
            largestFiles: sorted,
            message: `Total usage: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function listFiles({ dirPath, recursive = false, limit = 1000 }) {
    try {
        if (!dirPath) {
            return { success: false, error: 'dirPath is required' };
        }

        if (!fs.existsSync(dirPath)) {
            return { success: false, error: `Directory not found: ${dirPath}` };
        }

        const files = [];

        function scanDirectory(dir, baseDir = dir) {
            const items = fs.readdirSync(dir);

            items.forEach(item => {
                try {
                    const filePath = path.join(dir, item);
                    const stat = fs.statSync(filePath);
                    const relativePath = path.relative(baseDir, filePath);

                    if (stat.isFile()) {
                        files.push({
                            path: relativePath,
                            name: item,
                            size: stat.size,
                            sizeFormatted: formatBytes(stat.size),
                            modified: stat.mtime.toISOString(),
                            type: 'file'
                        });
                    } else if (stat.isDirectory() && recursive && files.length < limit) {
                        files.push({
                            path: relativePath,
                            name: item,
                            type: 'directory'
                        });
                        scanDirectory(filePath, baseDir);
                    }

                    if (files.length >= limit) {
                        throw new Error('Limit reached');
                    }
                } catch (error) {
                    if (error.message !== 'Limit reached') {
                        // Skip files that can't be accessed
                    }
                }
            });
        }

        scanDirectory(dirPath);

        return {
            success: true,
            directory: dirPath,
            recursive,
            count: files.length,
            files: files.slice(0, limit),
            message: `Listed ${files.length} items`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function searchFiles({ dirPath, pattern, recursive = true, limit = 100 }) {
    try {
        if (!dirPath || !pattern) {
            return { success: false, error: 'dirPath and pattern required' };
        }

        if (!fs.existsSync(dirPath)) {
            return { success: false, error: `Directory not found: ${dirPath}` };
        }

        const results = [];
        const regex = new RegExp(pattern, 'i');

        function scanDirectory(dir) {
            const files = fs.readdirSync(dir);

            files.forEach(file => {
                try {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);

                    if (regex.test(file)) {
                        results.push({
                            path: filePath,
                            name: file,
                            type: stat.isDirectory() ? 'directory' : 'file',
                            size: stat.size,
                            sizeFormatted: formatBytes(stat.size),
                            modified: stat.mtime.toISOString()
                        });
                    }

                    if (stat.isDirectory() && recursive && results.length < limit) {
                        scanDirectory(filePath);
                    }
                } catch (error) {
                    // Skip files that can't be accessed
                }
            });
        }

        scanDirectory(dirPath);

        return {
            success: true,
            directory: dirPath,
            pattern,
            recursive,
            found: results.length,
            results: results.slice(0, limit),
            message: `Found ${results.length} matching files/directories`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
