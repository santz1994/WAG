// modules/media/color-palette.js
// Extract dominant colors from images

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

module.exports = {
    name: "Color Palette Extractor",
    slug: "color-palette",
    type: "api",
    version: "1.0.0",
    description: "Extract color palettes from images (batch supported)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'extract-palette':
                    return await extractPalette(params);
                case 'analyze-colors':
                    return await analyzeColors(params);
                case 'batch-extract':
                    return await batchExtract(params);
                case 'generate-harmony':
                    return await generateHarmony(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function extractPalette({ filePath, colorCount = 5, quality = 'medium' }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        const stats = await fs.stat(inputPath);
        
        if (!stats.isFile()) throw new Error('Path is not a file');

        // Resize image for faster processing
        const resizeSize = quality === 'high' ? 200 : quality === 'low' ? 50 : 100;
        
        const image = sharp(inputPath)
            .resize(resizeSize, resizeSize, { fit: 'cover' });
        
        const metadata = await image.metadata();
        const buffer = await image.raw().toBuffer();

        // Extract colors from buffer
        const colors = extractDominantColors(buffer, colorCount, metadata.channels);
        const hexColors = colors.map(rgb => rgbToHex(rgb.r, rgb.g, rgb.b));

        return {
            success: true,
            message: 'Palette extracted successfully',
            file: filePath,
            colorCount,
            colors: hexColors,
            rgbValues: colors,
            quality
        };
    } catch (error) {
        throw error;
    }
}

async function analyzeColors({ filePath }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        await fs.stat(inputPath);

        const image = sharp(inputPath).resize(100, 100, { fit: 'cover' });
        const metadata = await image.metadata();
        const buffer = await image.raw().toBuffer();

        const colors = extractDominantColors(buffer, 8, metadata.channels);
        
        // Analyze color properties
        const analysis = colors.map(rgb => {
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            const saturation = hsl.s;
            const colorName = getColorName(rgb.r, rgb.g, rgb.b);

            return {
                hex,
                rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
                hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
                brightness: Math.round(brightness),
                saturation: Math.round(saturation),
                colorName,
                percentage: rgb.percentage || 0
            };
        });

        const avgBrightness = Math.round(analysis.reduce((sum, c) => sum + c.brightness, 0) / analysis.length);
        const avgSaturation = Math.round(analysis.reduce((sum, c) => sum + c.saturation, 0) / analysis.length);

        return {
            success: true,
            file: filePath,
            analysis,
            summary: {
                averageBrightness: avgBrightness,
                averageSaturation: avgSaturation,
                dominantColorName: analysis[0].colorName,
                colorDiversity: colors.length
            }
        };
    } catch (error) {
        throw error;
    }
}

async function batchExtract({ directory, colorCount = 5, recursive = false, outputFormat = 'json' }) {
    try {
        if (!directory) throw new Error('directory is required');

        const inputDir = path.resolve(directory);
        const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
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

        const results = [];
        for (const file of files) {
            try {
                const result = await extractPalette({ filePath: file, colorCount });
                results.push({
                    file: path.relative(inputDir, file),
                    status: 'success',
                    colors: result.colors,
                    colorCount: result.colorCount
                });
            } catch (err) {
                results.push({
                    file: path.relative(inputDir, file),
                    status: 'failed',
                    error: err.message
                });
            }
        }

        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;

        // Save results if format is json
        let outputFile = null;
        if (outputFormat === 'json') {
            outputFile = path.join(inputDir, 'color-palettes.json');
            await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
        } else if (outputFormat === 'csv') {
            outputFile = path.join(inputDir, 'color-palettes.csv');
            const csv = 'File,Color1,Color2,Color3,Color4,Color5\n' + 
                results.map(r => `"${r.file}","${r.colors.join('","')}"`).join('\n');
            await fs.writeFile(outputFile, csv);
        }

        return {
            success: true,
            message: `Batch extraction complete: ${successful} successful, ${failed} failed`,
            totalFiles: files.length,
            successful,
            failed,
            outputFile,
            results
        };
    } catch (error) {
        throw error;
    }
}

async function generateHarmony({ filePath, scheme = 'complementary' }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const paletteResult = await extractPalette({ filePath, colorCount: 1 });
        if (!paletteResult.success) throw new Error('Failed to extract base color');

        const baseColor = paletteResult.rgbValues[0];
        const baseHex = paletteResult.colors[0];
        const hsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);

        let harmonyColors = [];

        switch (scheme) {
            case 'complementary':
                harmonyColors = [
                    baseHex,
                    hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)
                ];
                break;
            case 'triadic':
                harmonyColors = [
                    baseHex,
                    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
                    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
                ];
                break;
            case 'analogous':
                harmonyColors = [
                    hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
                    baseHex,
                    hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l)
                ];
                break;
            case 'tetradic':
                harmonyColors = [
                    baseHex,
                    hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
                    hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
                    hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l)
                ];
                break;
            default:
                throw new Error('Unknown scheme: ' + scheme);
        }

        return {
            success: true,
            file: filePath,
            baseColor: baseHex,
            scheme,
            harmonyColors
        };
    } catch (error) {
        throw error;
    }
}

// Utility functions
function extractDominantColors(buffer, colorCount, channels) {
    const colorMap = {};
    const step = channels === 4 ? 4 : 3;

    for (let i = 0; i < buffer.length; i += step) {
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];
        const key = `${r},${g},${b}`;

        colorMap[key] = (colorMap[key] || 0) + 1;
    }

    const sorted = Object.entries(colorMap)
        .map(([key, count]) => {
            const [r, g, b] = key.split(',').map(Number);
            return { r, g, b, count, percentage: Math.round((count / (buffer.length / step)) * 100) };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, colorCount);

    return sorted;
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return rgbToHex(r, g, b);
}

function getColorName(r, g, b) {
    const colors = {
        '#FF0000': 'Red', '#00FF00': 'Lime', '#0000FF': 'Blue',
        '#FFFF00': 'Yellow', '#FF00FF': 'Magenta', '#00FFFF': 'Cyan',
        '#FFA500': 'Orange', '#800080': 'Purple', '#FFC0CB': 'Pink',
        '#A52A2A': 'Brown', '#808080': 'Gray', '#FFFFFF': 'White',
        '#000000': 'Black'
    };

    const hex = rgbToHex(r, g, b);
    return colors[hex] || 'Custom';
}
