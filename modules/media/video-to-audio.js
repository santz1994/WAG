// modules/media/video-to-audio.js
// Extract audio from video files

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const ffmpegPath = require('ffmpeg-static');

module.exports = {
    name: "Video to Audio",
    slug: "video-to-audio",
    type: "api",
    version: "1.0.0",
    description: "Extract audio from video files (batch supported)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'extract-audio':
                    return await extractAudio(params);
                case 'batch-extract':
                    return await batchExtract(params);
                case 'convert-format':
                    return await convertFormat(params);
                case 'get-info':
                    return await getInfo(params);
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

async function extractAudio({ filePath, outputPath, format = 'mp3', bitrate = '192k' }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        const stats = await fs.stat(inputPath);
        
        if (!stats.isFile()) throw new Error('Path is not a file');

        const supportedInputs = ['.mp4', '.avi', '.mkv', '.mov', '.flv', '.wmv', '.webm', '.m4v'];
        if (!supportedInputs.includes(path.extname(filePath).toLowerCase())) {
            throw new Error(`Unsupported video format. Supported: ${supportedInputs.join(', ')}`);
        }

        const finalOutput = outputPath || `${path.dirname(filePath)}/${path.parse(filePath).name}.${format}`;

        const args = [
            '-i', inputPath,
            '-vn',
            '-acodec', format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : format === 'wav' ? 'pcm_s16le' : 'libvorbis',
            '-ab', bitrate,
            '-y',
            finalOutput
        ];

        await runFFmpeg(args);

        const newStats = await fs.stat(finalOutput);

        return {
            success: true,
            message: 'Audio extracted successfully',
            file: finalOutput,
            format,
            bitrate,
            audioSize: newStats.size,
            videoSize: stats.size,
            compressionRatio: ((newStats.size / stats.size) * 100).toFixed(2) + '%'
        };
    } catch (error) {
        throw error;
    }
}

async function batchExtract({ directory, format = 'mp3', bitrate = '192k', outputDir, recursive = false, dryRun = false }) {
    try {
        if (!directory) throw new Error('directory is required');

        const inputDir = path.resolve(directory);
        const outDir = outputDir || inputDir;

        if (!dryRun && !(await fs.stat(outDir)).isDirectory()) {
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
                format,
                files: files.map(f => path.relative(inputDir, f))
            };
        }

        const results = [];
        for (const file of files) {
            try {
                const outputFile = path.join(outDir, `${path.parse(file).name}.${format}`);
                const result = await extractAudio({
                    filePath: file,
                    outputPath: outputFile,
                    format,
                    bitrate
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
            message: `Batch extraction complete: ${successful} successful, ${failed} failed`,
            totalFiles: files.length,
            successful,
            failed,
            results
        };
    } catch (error) {
        throw error;
    }
}

async function convertFormat({ filePath, outputPath, fromFormat, toFormat }) {
    try {
        if (!filePath) throw new Error('filePath is required');
        if (!toFormat) throw new Error('toFormat is required (mp3, aac, wav, opus)');

        const inputPath = path.resolve(filePath);
        await fs.stat(inputPath);

        const formatMap = {
            'mp3': 'libmp3lame',
            'aac': 'aac',
            'wav': 'pcm_s16le',
            'opus': 'libopus'
        };

        if (!formatMap[toFormat]) throw new Error(`Unsupported format: ${toFormat}`);

        const finalOutput = outputPath || `${path.dirname(filePath)}/${path.parse(filePath).name}.${toFormat}`;

        const args = [
            '-i', inputPath,
            '-acodec', formatMap[toFormat],
            '-ab', '192k',
            '-y',
            finalOutput
        ];

        await runFFmpeg(args);

        const stats = await fs.stat(finalOutput);

        return {
            success: true,
            message: `Audio converted to ${toFormat}`,
            file: finalOutput,
            format: toFormat,
            size: stats.size
        };
    } catch (error) {
        throw error;
    }
}

async function getInfo({ filePath }) {
    try {
        if (!filePath) throw new Error('filePath is required');

        const inputPath = path.resolve(filePath);
        await fs.stat(inputPath);

        const args = [
            '-hide_banner',
            '-i', inputPath
        ];

        try {
            await runFFmpeg(args);
        } catch (error) {
            // FFmpeg returns exit code 1 for info, we parse stderr
            const output = error.message;
            
            // Extract duration
            const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
            const duration = durationMatch ? `${durationMatch[1]}:${durationMatch[2]}:${durationMatch[3]}` : 'Unknown';

            // Extract audio stream info
            const audioMatch = output.match(/Audio: ([^,]+)/);
            const audioFormat = audioMatch ? audioMatch[1] : 'Unknown';

            // Extract bitrate
            const bitrateMatch = output.match(/(\d+)\s*kb\/s/);
            const bitrate = bitrateMatch ? bitrateMatch[1] + ' kbps' : 'Unknown';

            return {
                success: true,
                file: filePath,
                info: {
                    duration,
                    audioFormat,
                    bitrate,
                    container: path.extname(filePath).slice(1).toUpperCase()
                }
            };
        }

        return {
            success: true,
            file: filePath,
            info: { message: 'Unable to extract full metadata' }
        };
    } catch (error) {
        throw error;
    }
}
