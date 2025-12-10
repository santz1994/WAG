// modules/media/metadata-scrubber.js
// Remove EXIF and metadata from images

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: "Metadata Scrubber",
    slug: "metadata-scrubber",
    type: "api",
    version: "1.0.0",
    description: "Remove EXIF and metadata from images (batch supported)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'remove-metadata':
                    return await removeMetadata(params);
                case 'remove-batch':
                    return await removeBatch(params);
                case 'view-metadata':
                    return await viewMetadata(params);
                case 'compress-images':
                    return await compressImages(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function removeMetadata({ filePath, outputPath, format = 'same', quality = 80 }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        const stats = await fs.stat(inputPath);
        
        if (!stats.isFile()) throw new Error('Path is not a file');

        // Determine output format
        let outputFormat = format === 'same' ? path.extname(filePath).toLowerCase().slice(1) : format;
        if (!outputFormat || outputFormat === '') outputFormat = 'png';

        const finalOutput = outputPath || `${path.dirname(filePath)}/${path.parse(filePath).name}_cleaned.${outputFormat}`;

        // Process with sharp to strip metadata
        let pipeline = sharp(inputPath).withMetadata(false);

        if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
            pipeline = pipeline.jpeg({ quality, progressive: true });
        } else if (outputFormat === 'webp') {
            pipeline = pipeline.webp({ quality });
        } else if (outputFormat === 'png') {
            pipeline = pipeline.png({ quality });
        }

        await pipeline.toFile(finalOutput);

        const originalSize = stats.size;
        const newStats = await fs.stat(finalOutput);
        const newSize = newStats.size;
        const reduction = Math.round(((originalSize - newSize) / originalSize) * 100);

        return {
            success: true,
            message: 'Metadata removed successfully',
            file: finalOutput,
            originalSize,
            newSize,
            sizeReduction: `${reduction}%`,
            format: outputFormat
        };
    } catch (error) {
        throw error;
    }
}

async function removeBatch({ directory, outputDir, format = 'same', quality = 80, recursive = false, dryRun = false }) {
    try {
        if (!directory) throw new Error('directory is required');

        const inputDir = path.resolve(directory);
        const outDir = outputDir || inputDir;
        
        if (!dryRun && !(await fs.stat(outDir)).isDirectory()) {
            await fs.mkdir(outDir, { recursive: true });
        }

        const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif'];
        let files = [];

        // Get files
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
                const result = await removeMetadata({
                    filePath: file,
                    outputPath: path.join(outDir, `${path.parse(file).name}_cleaned.${format === 'same' ? path.extname(file).slice(1) : format}`),
                    format,
                    quality
                });
                results.push({ file: path.relative(inputDir, file), status: 'success', ...result });
            } catch (err) {
                results.push({ file: path.relative(inputDir, file), status: 'failed', error: err.message });
            }
        }

        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;

        return {
            success: true,
            message: `Batch processing complete: ${successful} successful, ${failed} failed`,
            totalFiles: files.length,
            successful,
            failed,
            results
        };
    } catch (error) {
        throw error;
    }
}

async function viewMetadata({ filePath }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        const metadata = await sharp(inputPath).metadata();

        return {
            success: true,
            file: filePath,
            metadata: {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                orientation: metadata.orientation,
                pages: metadata.pages,
                pageHeight: metadata.pageHeight,
                loop: metadata.loop,
                pagDelay: metadata.pagDelay,
                hasProfile: metadata.hasProfile,
                exif: metadata.exif ? 'Present' : 'None',
                icc: metadata.icc ? 'Present' : 'None'
            }
        };
    } catch (error) {
        throw error;
    }
}

async function compressImages({ directory, quality = 75, outputDir, recursive = false, dryRun = false }) {
    try {
        if (!directory) throw new Error('directory is required');

        const inputDir = path.resolve(directory);
        const outDir = outputDir || inputDir;
        
        if (!dryRun && !(await fs.stat(outDir)).isDirectory()) {
            await fs.mkdir(outDir, { recursive: true });
        }

        const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];
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
                quality,
                estimatedSavings: `${files.length * 20}-${files.length * 40}%`
            };
        }

        const results = [];
        let totalOriginal = 0;
        let totalCompressed = 0;

        for (const file of files) {
            try {
                const originalStats = await fs.stat(file);
                const ext = path.extname(file).toLowerCase();
                
                let pipeline = sharp(file).withMetadata(false);
                if (ext === '.png') {
                    pipeline = pipeline.png({ quality });
                } else if (['.jpg', '.jpeg'].includes(ext)) {
                    pipeline = pipeline.jpeg({ quality, progressive: true });
                } else if (ext === '.webp') {
                    pipeline = pipeline.webp({ quality });
                }

                const compressed = await pipeline.toBuffer();
                const outputFile = path.join(outDir, path.basename(file));
                await fs.writeFile(outputFile, compressed);

                totalOriginal += originalStats.size;
                totalCompressed += compressed.length;

                const reduction = Math.round(((originalStats.size - compressed.length) / originalStats.size) * 100);
                results.push({
                    file: path.relative(inputDir, file),
                    originalSize: originalStats.size,
                    compressedSize: compressed.length,
                    reduction: `${reduction}%`
                });
            } catch (err) {
                results.push({ file: path.relative(inputDir, file), status: 'failed', error: err.message });
            }
        }

        const totalReduction = Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100);

        return {
            success: true,
            message: `Compression complete: ${files.length} files processed`,
            totalOriginal,
            totalCompressed,
            totalReduction: `${totalReduction}%`,
            results
        };
    } catch (error) {
        throw error;
    }
}
