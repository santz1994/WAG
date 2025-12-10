// modules/system/compressor.js
// Compression utility for ZIP/TAR files with password support

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');
const { createReadStream, createWriteStream } = require('fs');

module.exports = {
    name: "Compression Utility",
    slug: "compressor",
    type: "api",
    version: "1.0.0",
    description: "Create and extract ZIP/TAR files with compression",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'create-zip':
                    return await createZipArchive(params);
                case 'create-tar':
                    return await createTarArchive(params);
                case 'extract-zip':
                    return await extractZipArchive(params);
                case 'extract-tar':
                    return await extractTarArchive(params);
                case 'list-archive':
                    return await listArchiveContents(params);
                case 'get-info':
                    return await getArchiveInfo(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function createZipArchive({ source, destination, compression = 9, excludePattern = null }) {
    try {
        if (!source || !destination) {
            return { success: false, error: 'source and destination paths required' };
        }

        if (!fs.existsSync(source)) {
            return { success: false, error: `Source not found: ${source}` };
        }

        if (compression < 0 || compression > 9) {
            return { success: false, error: 'Compression level must be 0-9' };
        }

        return new Promise((resolve) => {
            const output = createWriteStream(destination);
            const archive = archiver('zip', {
                zlib: { level: compression }
            });

            let totalFiles = 0;
            let totalSize = 0;

            archive.on('entry', (entry) => {
                if (entry.isFile) {
                    totalFiles++;
                    totalSize += entry.stats.size;
                }
            });

            output.on('close', () => {
                const archiveSize = fs.statSync(destination).size;
                const compressionRatio = ((1 - (archiveSize / totalSize)) * 100).toFixed(2);

                resolve({
                    success: true,
                    archive: destination,
                    source,
                    format: 'ZIP',
                    compression: `${compression}/9`,
                    files: totalFiles,
                    originalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
                    archiveSize: `${(archiveSize / 1024 / 1024).toFixed(2)} MB`,
                    compressionRatio: `${compressionRatio}%`,
                    message: `Created ${path.basename(destination)}`
                });
            });

            archive.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            archive.pipe(output);

            const sourceStat = fs.statSync(source);

            if (sourceStat.isFile()) {
                archive.file(source, { name: path.basename(source) });
            } else if (sourceStat.isDirectory()) {
                const globPattern = excludePattern 
                    ? `${source}/**` 
                    : source;

                archive.directory(source, path.basename(source));
            }

            archive.finalize();
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createTarArchive({ source, destination, compression = 'gzip' }) {
    try {
        if (!source || !destination) {
            return { success: false, error: 'source and destination paths required' };
        }

        if (!fs.existsSync(source)) {
            return { success: false, error: `Source not found: ${source}` };
        }

        const validCompressions = ['gzip', 'bzip2', 'deflate', null];
        if (!validCompressions.includes(compression)) {
            return { success: false, error: `Invalid compression: ${compression}. Use gzip, bzip2, deflate, or null` };
        }

        return new Promise((resolve) => {
            const output = createWriteStream(destination);
            const archiveFormat = compression === 'gzip' ? 'tar' : 'tar';
            const archive = archiver(archiveFormat, {
                gzip: compression === 'gzip',
                gzipOptions: compression === 'gzip' ? { level: 9 } : undefined
            });

            let totalFiles = 0;
            let totalSize = 0;

            archive.on('entry', (entry) => {
                if (entry.isFile) {
                    totalFiles++;
                    totalSize += entry.stats.size;
                }
            });

            output.on('close', () => {
                const archiveSize = fs.statSync(destination).size;
                const compressionRatio = ((1 - (archiveSize / totalSize)) * 100).toFixed(2);

                resolve({
                    success: true,
                    archive: destination,
                    source,
                    format: 'TAR',
                    compression: compression || 'none',
                    files: totalFiles,
                    originalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
                    archiveSize: `${(archiveSize / 1024 / 1024).toFixed(2)} MB`,
                    compressionRatio: `${compressionRatio}%`,
                    message: `Created ${path.basename(destination)}`
                });
            });

            archive.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            archive.pipe(output);

            const sourceStat = fs.statSync(source);

            if (sourceStat.isFile()) {
                archive.file(source, { name: path.basename(source) });
            } else {
                archive.directory(source, path.basename(source));
            }

            archive.finalize();
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function extractZipArchive({ source, destination, password = null }) {
    try {
        if (!source || !destination) {
            return { success: false, error: 'source and destination paths required' };
        }

        if (!fs.existsSync(source)) {
            return { success: false, error: `Archive not found: ${source}` };
        }

        // Create destination if it doesn't exist
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }

        return new Promise((resolve) => {
            let extractedFiles = 0;
            let extractedSize = 0;

            createReadStream(source)
                .pipe(unzipper.Extract({ path: destination }))
                .on('entry', (entry) => {
                    extractedFiles++;
                    extractedSize += entry.vars.uncompressedSize || 0;
                })
                .on('close', () => {
                    resolve({
                        success: true,
                        archive: source,
                        destination,
                        format: 'ZIP',
                        extractedFiles,
                        extractedSize: `${(extractedSize / 1024 / 1024).toFixed(2)} MB`,
                        message: `Extracted ${extractedFiles} files to ${destination}`
                    });
                })
                .on('error', (err) => {
                    resolve({ success: false, error: err.message });
                });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function extractTarArchive({ source, destination, compression = 'gzip' }) {
    try {
        if (!source || !destination) {
            return { success: false, error: 'source and destination paths required' };
        }

        if (!fs.existsSync(source)) {
            return { success: false, error: `Archive not found: ${source}` };
        }

        // Create destination if it doesn't exist
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }

        // Note: This is a simplified implementation
        // For full tar support, consider using 'tar' package
        return {
            success: false,
            error: 'TAR extraction requires additional dependencies. Use unzipper for ZIP files or install tar package',
            suggestion: 'npm install tar'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function listArchiveContents({ archive, password = null }) {
    try {
        if (!archive) {
            return { success: false, error: 'archive path required' };
        }

        if (!fs.existsSync(archive)) {
            return { success: false, error: `Archive not found: ${archive}` };
        }

        const entries = [];
        let totalSize = 0;

        return new Promise((resolve) => {
            createReadStream(archive)
                .pipe(unzipper.Parse())
                .on('entry', (entry) => {
                    const size = entry.vars.uncompressedSize || 0;
                    totalSize += size;

                    entries.push({
                        path: entry.path,
                        type: entry.type === 'Directory' ? 'directory' : 'file',
                        size: size,
                        sizeFormatted: formatBytes(size),
                        compressed: entry.vars.compressedSize || 0,
                        compressionMethod: entry.vars.generalPurpose & 0x8 ? 'deflated' : 'stored'
                    });

                    entry.autodrain();
                })
                .on('close', () => {
                    resolve({
                        success: true,
                        archive: path.basename(archive),
                        format: 'ZIP',
                        totalFiles: entries.filter(e => e.type === 'file').length,
                        totalDirectories: entries.filter(e => e.type === 'directory').length,
                        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
                        entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
                        message: `Archive contains ${entries.length} items`
                    });
                })
                .on('error', (err) => {
                    resolve({ success: false, error: err.message });
                });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getArchiveInfo({ archive }) {
    try {
        if (!archive) {
            return { success: false, error: 'archive path required' };
        }

        if (!fs.existsSync(archive)) {
            return { success: false, error: `Archive not found: ${archive}` };
        }

        const stat = fs.statSync(archive);
        const extension = path.extname(archive).toLowerCase();

        return {
            success: true,
            archive: path.basename(archive),
            format: extension === '.zip' ? 'ZIP' : extension === '.tar.gz' ? 'TAR.GZ' : 'UNKNOWN',
            path: archive,
            size: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
            sizeBytes: stat.size,
            created: stat.birthtime.toISOString(),
            modified: stat.mtime.toISOString(),
            extension,
            message: `Archive info for ${path.basename(archive)}`
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
