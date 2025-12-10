// modules/media/image-resizer.js
// Image Resizer Tool - Resize, crop, and transform images

// Note: This module needs 'sharp' npm package
// Install with: npm install sharp

const fs = require('fs');
const path = require('path');

module.exports = {
    name: "Image Resizer",
    slug: "image-resize",
    type: "api",
    version: "1.0.0",
    description: "Resize, crop, convert, and optimize images (JPEG, PNG, WebP, AVIF)",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'resize':
                    return await resize(params);
                case 'crop':
                    return await crop(params);
                case 'convert':
                    return await convert(params);
                case 'compress':
                    return await compress(params);
                case 'thumbnail':
                    return await thumbnail(params);
                case 'batch-resize':
                    return await batchResize(params);
                case 'get-info':
                    return await getImageInfo(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Resize image
async function resize(params) {
    try {
        const sharp = require('sharp');
        const {
            inputPath,
            width,
            height,
            fit = 'cover', // cover, contain, fill, inside, outside
            position = 'center',
            quality = 80,
            format = 'auto', // auto, jpeg, png, webp, avif
            outputPath
        } = params;

        if (!inputPath || !fs.existsSync(inputPath)) {
            throw new Error('Input image not found');
        }

        if (!width && !height) {
            throw new Error('Width or height is required');
        }

        let image = sharp(inputPath);
        
        // Get image info first
        const metadata = await image.metadata();
        
        // Resize with specified fit
        if (width || height) {
            image = image.resize(width, height, {
                fit,
                position,
                withoutEnlargement: true
            });
        }

        // Determine output format
        let outputFormat = format === 'auto' ? metadata.format : format;
        if (!outputFormat) outputFormat = 'jpeg';

        // Apply format-specific options
        let formatOptions = {};
        switch (outputFormat) {
            case 'jpeg':
                formatOptions = { quality, progressive: true };
                break;
            case 'png':
                formatOptions = { quality, compression: 9 };
                break;
            case 'webp':
                formatOptions = { quality };
                break;
            case 'avif':
                formatOptions = { quality };
                break;
        }

        image = image.toFormat(outputFormat, formatOptions);

        const filename = path.basename(inputPath, path.extname(inputPath)) + `_resized.${outputFormat}`;
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (outputPath) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const buffer = await image.toBuffer();
        fs.writeFileSync(filepath, buffer);

        return {
            status: true,
            action: 'resize',
            input: {
                filename: path.basename(inputPath),
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: fs.statSync(inputPath).size
            },
            output: {
                filename,
                filepath,
                width: width || Math.round(metadata.width * (height / metadata.height)),
                height: height || Math.round(metadata.height * (width / metadata.width)),
                format: outputFormat,
                size: buffer.length,
                quality
            },
            compression: ((1 - buffer.length / fs.statSync(inputPath).size) * 100).toFixed(2) + '%',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Image resize error: ${error.message}`);
    }
}

// Crop image
async function crop(params) {
    try {
        const sharp = require('sharp');
        const {
            inputPath,
            left = 0,
            top = 0,
            width,
            height,
            outputPath
        } = params;

        if (!inputPath || !fs.existsSync(inputPath)) {
            throw new Error('Input image not found');
        }

        if (!width || !height) {
            throw new Error('Width and height are required');
        }

        let image = sharp(inputPath);
        const metadata = await image.metadata();

        // Validate crop dimensions
        if (left + width > metadata.width || top + height > metadata.height) {
            throw new Error('Crop dimensions exceed image bounds');
        }

        image = image.extract({
            left: Math.max(0, left),
            top: Math.max(0, top),
            width: Math.min(width, metadata.width - left),
            height: Math.min(height, metadata.height - top)
        });

        const filename = path.basename(inputPath, path.extname(inputPath)) + '_cropped.jpg';
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (outputPath) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const buffer = await image.jpeg({ quality: 90 }).toBuffer();
        fs.writeFileSync(filepath, buffer);

        return {
            status: true,
            action: 'crop',
            input: {
                width: metadata.width,
                height: metadata.height
            },
            crop: {
                left,
                top,
                width,
                height
            },
            output: {
                filename,
                filepath,
                size: buffer.length
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Image crop error: ${error.message}`);
    }
}

// Convert image format
async function convert(params) {
    try {
        const sharp = require('sharp');
        const {
            inputPath,
            format = 'jpeg', // jpeg, png, webp, avif, tiff
            quality = 80,
            outputPath
        } = params;

        if (!inputPath || !fs.existsSync(inputPath)) {
            throw new Error('Input image not found');
        }

        const supportedFormats = ['jpeg', 'png', 'webp', 'avif', 'tiff'];
        if (!supportedFormats.includes(format.toLowerCase())) {
            throw new Error(`Unsupported format: ${format}`);
        }

        let image = sharp(inputPath);
        const metadata = await image.metadata();

        let formatOptions = {};
        switch (format.toLowerCase()) {
            case 'jpeg':
                formatOptions = { quality, progressive: true };
                break;
            case 'webp':
                formatOptions = { quality };
                break;
            case 'avif':
                formatOptions = { quality };
                break;
            case 'png':
                formatOptions = { quality: quality / 100 };
                break;
        }

        image = image.toFormat(format.toLowerCase(), formatOptions);

        const filename = path.basename(inputPath, path.extname(inputPath)) + `.${format}`;
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (outputPath) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const buffer = await image.toBuffer();
        fs.writeFileSync(filepath, buffer);

        const originalSize = fs.statSync(inputPath).size;

        return {
            status: true,
            action: 'convert',
            input: {
                format: metadata.format,
                size: originalSize
            },
            output: {
                filename,
                filepath,
                format,
                size: buffer.length
            },
            savings: ((1 - buffer.length / originalSize) * 100).toFixed(2) + '%',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Image conversion error: ${error.message}`);
    }
}

// Compress image
async function compress(params) {
    try {
        const sharp = require('sharp');
        const {
            inputPath,
            quality = 70,
            maxWidth = 2000,
            maxHeight = 2000,
            outputPath
        } = params;

        if (!inputPath || !fs.existsSync(inputPath)) {
            throw new Error('Input image not found');
        }

        let image = sharp(inputPath);
        const metadata = await image.metadata();

        // Resize if necessary
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
            image = image.resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Compress based on format
        if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
            image = image.jpeg({ quality, progressive: true });
        } else if (metadata.format === 'png') {
            image = image.png({ quality, compression: 9 });
        } else if (metadata.format === 'webp') {
            image = image.webp({ quality });
        } else {
            image = image.jpeg({ quality, progressive: true });
        }

        const filename = path.basename(inputPath, path.extname(inputPath)) + '_compressed.jpg';
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (outputPath) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const buffer = await image.toBuffer();
        fs.writeFileSync(filepath, buffer);

        const originalSize = fs.statSync(inputPath).size;
        const newSize = buffer.length;

        return {
            status: true,
            action: 'compress',
            input: {
                filename: path.basename(inputPath),
                size: originalSize,
                sizeMB: (originalSize / 1024 / 1024).toFixed(2) + ' MB'
            },
            output: {
                filename,
                filepath,
                size: newSize,
                sizeMB: (newSize / 1024 / 1024).toFixed(2) + ' MB'
            },
            compression: {
                reduction: ((1 - newSize / originalSize) * 100).toFixed(2) + '%',
                saved: (originalSize - newSize),
                savedMB: ((originalSize - newSize) / 1024 / 1024).toFixed(2) + ' MB'
            },
            quality,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Image compression error: ${error.message}`);
    }
}

// Create thumbnail
async function thumbnail(params) {
    try {
        const sharp = require('sharp');
        const {
            inputPath,
            size = 200,
            outputPath
        } = params;

        if (!inputPath || !fs.existsSync(inputPath)) {
            throw new Error('Input image not found');
        }

        let image = sharp(inputPath);
        
        image = image
            .resize(size, size, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 });

        const filename = path.basename(inputPath, path.extname(inputPath)) + `_thumb_${size}x${size}.jpg`;
        const filepath = outputPath ? path.join(outputPath, filename) : filename;

        if (outputPath) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const buffer = await image.toBuffer();
        fs.writeFileSync(filepath, buffer);

        return {
            status: true,
            action: 'thumbnail',
            input: path.basename(inputPath),
            output: {
                filename,
                filepath,
                size,
                filesize: buffer.length
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Thumbnail creation error: ${error.message}`);
    }
}

// Batch resize multiple images
async function batchResize(params) {
    try {
        const sharp = require('sharp');
        const {
            directory,
            width = 800,
            height = 600,
            format = 'jpeg',
            quality = 80,
            outputPath
        } = params;

        if (!directory || !fs.existsSync(directory)) {
            throw new Error('Directory not found');
        }

        const outDir = outputPath || path.join(directory, 'resized');
        fs.mkdirSync(outDir, { recursive: true });

        const files = fs.readdirSync(directory)
            .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

        const results = [];

        for (const file of files) {
            try {
                const inputFile = path.join(directory, file);
                const image = sharp(inputFile);
                const metadata = await image.metadata();

                let processed = image.resize(width, height, {
                    fit: 'cover',
                    withoutEnlargement: true
                });

                if (format === 'jpeg') {
                    processed = processed.jpeg({ quality, progressive: true });
                } else if (format === 'png') {
                    processed = processed.png();
                } else if (format === 'webp') {
                    processed = processed.webp({ quality });
                }

                const filename = path.basename(file, path.extname(file)) + `_${width}x${height}.${format}`;
                const outputFile = path.join(outDir, filename);

                const buffer = await processed.toBuffer();
                fs.writeFileSync(outputFile, buffer);

                results.push({
                    input: file,
                    output: filename,
                    originalSize: fs.statSync(inputFile).size,
                    newSize: buffer.length,
                    status: 'success'
                });
            } catch (error) {
                results.push({
                    input: file,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return {
            status: true,
            action: 'batch-resize',
            directory,
            outputDirectory: outDir,
            total: files.length,
            success: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length,
            dimensions: `${width}x${height}`,
            format,
            results,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Batch resize error: ${error.message}`);
    }
}

// Get image metadata
async function getImageInfo(params) {
    try {
        const sharp = require('sharp');
        const { imagePath } = params;

        if (!imagePath || !fs.existsSync(imagePath)) {
            throw new Error('Image not found');
        }

        const image = sharp(imagePath);
        const metadata = await image.metadata();
        const fileStats = fs.statSync(imagePath);

        return {
            status: true,
            action: 'get-info',
            file: path.basename(imagePath),
            metadata: {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                space: metadata.space,
                channels: metadata.channels,
                depth: metadata.depth,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                orientation: metadata.orientation,
                exif: metadata.exif ? 'Yes' : 'No'
            },
            fileinfo: {
                size: fileStats.size,
                sizeMB: (fileStats.size / 1024 / 1024).toFixed(2),
                created: fileStats.birthtime,
                modified: fileStats.mtime
            },
            aspectRatio: (metadata.width / metadata.height).toFixed(2),
            pixelCount: metadata.width * metadata.height,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Image info error: ${error.message}`);
    }
}
