// modules/file/file-renamer.js
// File Renamer Tool - Bulk rename files (pattern, prefix, suffix, extension)

const fs = require('fs');
const path = require('path');

module.exports = {
    name: "File Renamer",
    slug: "file-renamer",
    type: "api",
    version: "1.0.0",
    description: "Bulk rename files by pattern, add prefix/suffix, remove extension",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'add-prefix':
                    return addPrefix(params);
                case 'add-suffix':
                    return addSuffix(params);
                case 'remove-extension':
                    return removeExtension(params);
                case 'replace-pattern':
                    return replacePattern(params);
                case 'change-extension':
                    return changeExtension(params);
                case 'batch-rename':
                    return batchRename(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Add prefix to files
function addPrefix(params) {
    const { directory, prefix, pattern = '*', dryRun = true } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    const results = [];
    const files = getFilesByPattern(directory, pattern);

    for (const file of files) {
        const oldPath = path.join(directory, file);
        const newName = prefix + file;
        const newPath = path.join(directory, newName);

        if (!dryRun && !fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
        }

        results.push({
            oldName: file,
            newName,
            operation: 'add-prefix',
            status: 'ready' // or 'completed' if executed
        });
    }

    return {
        status: true,
        action: 'add-prefix',
        directory,
        prefix,
        filesAffected: results.length,
        dryRun,
        results,
        note: dryRun ? 'Preview only. Set dryRun: false to execute' : 'Renaming completed',
        timestamp: new Date().toISOString()
    };
}

// Add suffix to files
function addSuffix(params) {
    const { directory, suffix, pattern = '*', dryRun = true } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    const results = [];
    const files = getFilesByPattern(directory, pattern);

    for (const file of files) {
        const oldPath = path.join(directory, file);
        const ext = path.extname(file);
        const name = path.basename(file, ext);
        const newName = name + suffix + ext;
        const newPath = path.join(directory, newName);

        if (!dryRun && !fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
        }

        results.push({
            oldName: file,
            newName,
            operation: 'add-suffix',
            status: 'ready'
        });
    }

    return {
        status: true,
        action: 'add-suffix',
        directory,
        suffix,
        filesAffected: results.length,
        dryRun,
        results,
        note: dryRun ? 'Preview only. Set dryRun: false to execute' : 'Renaming completed',
        timestamp: new Date().toISOString()
    };
}

// Remove extension
function removeExtension(params) {
    const { directory, pattern = '*', dryRun = true } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    const results = [];
    const files = getFilesByPattern(directory, pattern);

    for (const file of files) {
        const oldPath = path.join(directory, file);
        const newName = path.basename(file, path.extname(file));
        const newPath = path.join(directory, newName);

        if (!dryRun && !fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
        }

        results.push({
            oldName: file,
            newName,
            extensionRemoved: path.extname(file),
            status: 'ready'
        });
    }

    return {
        status: true,
        action: 'remove-extension',
        directory,
        filesAffected: results.length,
        dryRun,
        results,
        note: dryRun ? 'Preview only. Set dryRun: false to execute' : 'Extension removal completed',
        timestamp: new Date().toISOString()
    };
}

// Replace pattern in filenames
function replacePattern(params) {
    const { directory, findPattern, replaceWith, dryRun = true, useRegex = false } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    const results = [];
    const files = fs.readdirSync(directory).filter(f => {
        const stat = fs.statSync(path.join(directory, f));
        return stat.isFile();
    });

    for (const file of files) {
        let newName;
        
        if (useRegex) {
            try {
                const regex = new RegExp(findPattern, 'g');
                newName = file.replace(regex, replaceWith);
            } catch (error) {
                results.push({
                    oldName: file,
                    error: 'Invalid regex pattern',
                    status: 'failed'
                });
                continue;
            }
        } else {
            newName = file.replaceAll(findPattern, replaceWith);
        }

        if (newName === file) continue; // No change

        const oldPath = path.join(directory, file);
        const newPath = path.join(directory, newName);

        if (!dryRun && !fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
        }

        results.push({
            oldName: file,
            newName,
            operation: 'replace-pattern',
            status: 'ready'
        });
    }

    return {
        status: true,
        action: 'replace-pattern',
        directory,
        findPattern,
        replaceWith,
        filesAffected: results.length,
        dryRun,
        useRegex,
        results,
        note: dryRun ? 'Preview only. Set dryRun: false to execute' : 'Renaming completed',
        timestamp: new Date().toISOString()
    };
}

// Change file extension
function changeExtension(params) {
    const { directory, fromExtension, toExtension, pattern = '*', dryRun = true } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    const results = [];
    const from = fromExtension.startsWith('.') ? fromExtension : '.' + fromExtension;
    const to = toExtension.startsWith('.') ? toExtension : '.' + toExtension;
    const files = getFilesByPattern(directory, pattern).filter(f => f.endsWith(from));

    for (const file of files) {
        const oldPath = path.join(directory, file);
        const newName = path.basename(file, from) + to;
        const newPath = path.join(directory, newName);

        if (!dryRun && !fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
        }

        results.push({
            oldName: file,
            newName,
            extensionChanged: `${from} → ${to}`,
            status: 'ready'
        });
    }

    return {
        status: true,
        action: 'change-extension',
        directory,
        fromExtension: from,
        toExtension: to,
        filesAffected: results.length,
        dryRun,
        results,
        note: dryRun ? 'Preview only. Set dryRun: false to execute' : 'Extension change completed',
        timestamp: new Date().toISOString()
    };
}

// Batch rename with multiple operations
function batchRename(params) {
    const { directory, operations, dryRun = true } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found');
    }

    if (!Array.isArray(operations) || operations.length === 0) {
        throw new Error('Operations array is required');
    }

    const results = [];

    for (const op of operations) {
        const { type, value, pattern = '*' } = op;
        const files = getFilesByPattern(directory, pattern);

        for (const file of files) {
            let newName = file;

            switch (type) {
                case 'prefix':
                    newName = value + file;
                    break;
                case 'suffix':
                    const ext = path.extname(file);
                    const name = path.basename(file, ext);
                    newName = name + value + ext;
                    break;
                case 'remove-ext':
                    newName = path.basename(file, path.extname(file));
                    break;
                default:
                    continue;
            }

            if (newName !== file) {
                const oldPath = path.join(directory, file);
                const newPath = path.join(directory, newName);

                if (!dryRun && !fs.existsSync(newPath)) {
                    fs.renameSync(oldPath, newPath);
                }

                results.push({
                    oldName: file,
                    newName,
                    operation: type,
                    status: 'ready'
                });
            }
        }
    }

    return {
        status: true,
        action: 'batch-rename',
        directory,
        operationsCount: operations.length,
        filesAffected: results.length,
        dryRun,
        results,
        note: dryRun ? 'Preview only. Set dryRun: false to execute' : 'Batch renaming completed',
        timestamp: new Date().toISOString()
    };
}

// Helper: Get files by pattern
function getFilesByPattern(directory, pattern) {
    return fs.readdirSync(directory).filter(f => {
        const stat = fs.statSync(path.join(directory, f));
        if (!stat.isFile()) return false;

        if (pattern === '*') return true;

        // Simple pattern matching (glob-like)
        if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return regex.test(f);
        }

        return f.includes(pattern);
    });
}
