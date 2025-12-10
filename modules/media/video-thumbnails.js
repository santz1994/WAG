// modules/media/video-thumbnails.js
// Generate thumbnail images from video files

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const ffmpegPath = require('ffmpeg-static');

module.exports = {
    name: "Video Thumbnails",
    slug: "video-thumbnails",
    type: "api",
    version: "1.0.0",
    description: "Generate thumbnails from video files (batch supported)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'generate-thumbnail':
                    return await generateThumbnail(params);
                case 'batch-generate':
                    return await batchGenerate(params);
                case 'extract-frames':
                    return await extractFrames(params);
                case 'custom-size':
                    return await customSize(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const process = spawn(ffmpegPath, args);
        let output = '';
        let error = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.stderr.on('data', (data) => {
            error += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(error || `FFmpeg exited with code ${code}`));
            }
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
}

async function generateThumbnail({ filePath, outputPath, timeOffset = '00:00:01', width = 320, height = 240 }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        const stats = await fs.stat(inputPath);
        
        if (!stats.isFile()) throw new Error('Path is not a file');

        const supportedInputs = ['.mp4', '.avi', '.mkv', '.mov', '.flv', '.wmv', '.webm'];
        if (!supportedInputs.includes(path.extname(filePath).toLowerCase())) {
            throw new Error(`Unsupported video format`);
        }

        const finalOutput = outputPath || `${path.dirname(filePath)}/${path.parse(filePath).name}_thumb.jpg`;

        const args = [
            '-ss', timeOffset,
            '-i', inputPath,
            '-vframes', '1',
            '-vf', `scale=${width}:${height}`,
            '-q:v', '2',
            '-y',
            finalOutput
        ];

        await runFFmpeg(args);

        const thumbStats = await fs.stat(finalOutput);

        return {
            success: true,
            message: 'Thumbnail generated successfully',
            file: finalOutput,
            width,
            height,
            timeOffset,
            size: thumbStats.size
        };
    } catch (error) {
        throw error;
    }
}

async function batchGenerate({ directory, timeOffset = '00:00:01', width = 320, height = 240, outputDir, recursive = false, dryRun = false }) {
    try {
        if (!directory) throw new Error('directory is required');

        const inputDir = path.resolve(directory);
        const outDir = outputDir || path.join(inputDir, 'thumbnails');

        if (!dryRun && !(await fs.stat(outDir).catch(() => null))) {
            await fs.mkdir(outDir, { recursive: true });
        }

        const supportedFormats = ['.mp4', '.avi', '.mkv', '.mov', '.flv', '.wmv', '.webm'];
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
                width,
                height,
                files: files.map(f => path.relative(inputDir, f))
            };
        }

        const results = [];
        for (const file of files) {
            try {
                const outputFile = path.join(outDir, `${path.parse(file).name}_thumb.jpg`);
                const result = await generateThumbnail({
                    filePath: file,
                    outputPath: outputFile,
                    timeOffset,
                    width,
                    height
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
            message: `Batch generation complete: ${successful} successful, ${failed} failed`,
            totalFiles: files.length,
            successful,
            failed,
            outputDirectory: outDir,
            results
        };
    } catch (error) {
        throw error;
    }
}

async function extractFrames({ filePath, outputDir, interval = '00:00:05', width = 320, height = 240, count = 10 }) {
    try {
        if (!filePath) throw new Error('filePath is required');
        if (!outputDir) throw new Error('outputDir is required');

        const inputPath = path.resolve(filePath);
        await fs.stat(inputPath);

        // Create output directory
        if (!(await fs.stat(outputDir).catch(() => null))) {
            await fs.mkdir(outputDir, { recursive: true });
        }

        const frameName = `${path.parse(filePath).name}_frame_%03d.jpg`;
        const outputPattern = path.join(outputDir, frameName);

        const args = [
            '-i', inputPath,
            '-vf', `fps=1/${interval.split(':')[2] || 5},scale=${width}:${height}`,
            '-q:v', '2',
            '-y',
            outputPattern
        ];

        await runFFmpeg(args);

        // List generated frames
        const frames = await fs.readdir(outputDir);
        const generatedFrames = frames.filter(f => f.includes(path.parse(filePath).name) && f.includes('frame'));

        return {
            success: true,
            message: `Extracted ${generatedFrames.length} frames`,
            outputDirectory: outputDir,
            frames: generatedFrames,
            interval,
            width,
            height
        };
    } catch (error) {
        throw error;
    }
}

async function customSize({ filePath, outputPath, width = 640, height = 480, timeOffset = '00:00:01', quality = 2 }) {
    try {
        if (!filePath) throw new Error('filePath is required');
        if (!width || !height) throw new Error('width and height are required');

        const inputPath = path.resolve(filePath);
        await fs.stat(inputPath);

        const finalOutput = outputPath || `${path.dirname(filePath)}/${path.parse(filePath).name}_${width}x${height}.jpg`;

        const args = [
            '-ss', timeOffset,
            '-i', inputPath,
            '-vframes', '1',
            '-vf', `scale=${width}:${height}`,
            '-q:v', quality.toString(),
            '-y',
            finalOutput
        ];

        await runFFmpeg(args);

        const stats = await fs.stat(finalOutput);

        return {
            success: true,
            message: 'Custom thumbnail generated',
            file: finalOutput,
            dimensions: `${width}x${height}`,
            quality,
            size: stats.size
        };
    } catch (error) {
        throw error;
    }
}
