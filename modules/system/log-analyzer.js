// modules/system/log-analyzer.js
// Parse and analyze log files for errors, patterns, and keywords

const fs = require('fs');
const path = require('path');
const readline = require('readline');

module.exports = {
    name: "Log Analyzer",
    slug: "log-analyzer",
    type: "api",
    version: "1.0.0",
    description: "Parse log files and search for errors/keywords",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'search':
                    return await searchLogs(params);
                case 'analyze':
                    return await analyzeLogs(params);
                case 'get-summary':
                    return await getSummary(params);
                case 'get-stats':
                    return await getStatistics(params);
                case 'find-errors':
                    return await findErrors(params);
                case 'follow':
                    return await followLog(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function searchLogs({ filePath, keyword, caseSensitive = false, limit = 100, context = 0 }) {
    try {
        if (!filePath || !keyword) {
            return { success: false, error: 'filePath and keyword required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const matches = [];
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(keyword, flags);

        return new Promise((resolve) => {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let lineNum = 0;

            rl.on('line', (line) => {
                lineNum++;

                if (regex.test(line)) {
                    matches.push({
                        lineNumber: lineNum,
                        content: line.substring(0, 200),
                        fullLine: line,
                        matched: keyword
                    });

                    regex.lastIndex = 0; // Reset regex
                }

                if (matches.length >= limit) {
                    rl.close();
                }
            });

            rl.on('close', () => {
                resolve({
                    success: true,
                    filePath: path.basename(filePath),
                    keyword,
                    caseSensitive,
                    totalMatches: matches.length,
                    matches: matches.slice(0, limit),
                    message: `Found ${matches.length} matches`,
                    searchComplete: matches.length < limit
                });
            });

            rl.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function analyzeLogs({ filePath, limit = 1000 }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const analysis = {
            totalLines: 0,
            errors: 0,
            warnings: 0,
            info: 0,
            debug: 0,
            levelDistribution: {},
            timestamps: [],
            uniqueErrors: new Set(),
            patterns: {}
        };

        return new Promise((resolve) => {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                analysis.totalLines++;

                // Detect log level
                if (line.includes('[ERROR]') || line.includes('ERROR')) {
                    analysis.errors++;
                    analysis.levelDistribution['ERROR'] = (analysis.levelDistribution['ERROR'] || 0) + 1;
                    analysis.uniqueErrors.add(extractErrorMessage(line));
                } else if (line.includes('[WARN') || line.includes('WARNING')) {
                    analysis.warnings++;
                    analysis.levelDistribution['WARNING'] = (analysis.levelDistribution['WARNING'] || 0) + 1;
                } else if (line.includes('[INFO]')) {
                    analysis.info++;
                    analysis.levelDistribution['INFO'] = (analysis.levelDistribution['INFO'] || 0) + 1;
                } else if (line.includes('[DEBUG]')) {
                    analysis.debug++;
                    analysis.levelDistribution['DEBUG'] = (analysis.levelDistribution['DEBUG'] || 0) + 1;
                }

                // Extract timestamp
                const timestamp = extractTimestamp(line);
                if (timestamp) {
                    analysis.timestamps.push(timestamp);
                }

                if (analysis.totalLines >= limit) {
                    rl.close();
                }
            });

            rl.on('close', () => {
                resolve({
                    success: true,
                    filePath: path.basename(filePath),
                    summary: {
                        totalLines: analysis.totalLines,
                        errors: analysis.errors,
                        warnings: analysis.warnings,
                        info: analysis.info,
                        debug: analysis.debug,
                        errorPercentage: `${((analysis.errors / analysis.totalLines) * 100).toFixed(2)}%`
                    },
                    distribution: analysis.levelDistribution,
                    uniqueErrors: Array.from(analysis.uniqueErrors).slice(0, 20),
                    timeRange: {
                        first: analysis.timestamps[0] || 'N/A',
                        last: analysis.timestamps[analysis.timestamps.length - 1] || 'N/A'
                    }
                });
            });

            rl.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getSummary({ filePath }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const stat = fs.statSync(filePath);
        let lineCount = 0;
        let firstLine = '';
        let lastLine = '';

        return new Promise((resolve) => {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                lineCount++;
                if (lineCount === 1) {
                    firstLine = line;
                }
                lastLine = line;
            });

            rl.on('close', () => {
                resolve({
                    success: true,
                    filePath: path.basename(filePath),
                    info: {
                        size: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
                        sizeBytes: stat.size,
                        created: stat.birthtime.toISOString(),
                        modified: stat.mtime.toISOString(),
                        lines: lineCount,
                        averageLineLength: `${(stat.size / lineCount).toFixed(0)} bytes`
                    },
                    firstLine: firstLine.substring(0, 100),
                    lastLine: lastLine.substring(0, 100)
                });
            });

            rl.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getStatistics({ filePath }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const stats = {
            levelCounts: {},
            topErrors: new Map(),
            sourceModules: new Map(),
            statusCodes: new Map()
        };

        return new Promise((resolve) => {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                // Count log levels
                const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
                levels.forEach(level => {
                    if (line.includes(`[${level}]`) || line.includes(level)) {
                        stats.levelCounts[level] = (stats.levelCounts[level] || 0) + 1;
                    }
                });

                // Extract error messages
                if (line.includes('ERROR')) {
                    const error = extractErrorMessage(line);
                    stats.topErrors.set(error, (stats.topErrors.get(error) || 0) + 1);
                }

                // Extract HTTP status codes
                const statusMatch = line.match(/\b([1-5]\d{2})\b/);
                if (statusMatch) {
                    stats.statusCodes.set(statusMatch[1], (stats.statusCodes.get(statusMatch[1]) || 0) + 1);
                }

                // Extract module names
                const moduleMatch = line.match(/\[([^\]]+)\]/);
                if (moduleMatch) {
                    stats.sourceModules.set(moduleMatch[1], (stats.sourceModules.get(moduleMatch[1]) || 0) + 1);
                }
            });

            rl.on('close', () => {
                resolve({
                    success: true,
                    filePath: path.basename(filePath),
                    levelDistribution: stats.levelCounts,
                    topErrors: Array.from(stats.topErrors.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([error, count]) => ({ error, count })),
                    statusCodes: Array.from(stats.statusCodes.entries())
                        .sort((a, b) => b[1] - a[1])
                        .map(([code, count]) => ({ code, count })),
                    topModules: Array.from(stats.sourceModules.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([module, count]) => ({ module, count }))
                });
            });

            rl.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function findErrors({ filePath, limit = 50 }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const errors = [];

        return new Promise((resolve) => {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let lineNum = 0;

            rl.on('line', (line) => {
                lineNum++;

                if (line.includes('ERROR') || line.includes('Exception') || line.includes('Failed')) {
                    errors.push({
                        lineNumber: lineNum,
                        timestamp: extractTimestamp(line),
                        message: line.substring(0, 150),
                        severity: detectSeverity(line)
                    });
                }

                if (errors.length >= limit) {
                    rl.close();
                }
            });

            rl.on('close', () => {
                resolve({
                    success: true,
                    filePath: path.basename(filePath),
                    errorCount: errors.length,
                    errors: errors,
                    message: `Found ${errors.length} error line(s)`
                });
            });

            rl.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function followLog({ filePath, lines = 20 }) {
    try {
        if (!filePath) {
            return { success: false, error: 'filePath required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const command = require('child_process').execSync(`tail -n ${lines} "${filePath}"`, { encoding: 'utf8' });
        const logLines = command.split('\n').filter(l => l.trim()).map((line, idx) => ({
            number: idx + 1,
            content: line
        }));

        return {
            success: true,
            filePath: path.basename(filePath),
            lines: lines,
            displayed: logLines.length,
            tail: logLines
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Helper functions
function extractErrorMessage(line) {
    const match = line.match(/ERROR[:\s]+(.+?)(?:\n|$)/i);
    return match ? match[1].substring(0, 100) : line.substring(0, 100);
}

function extractTimestamp(line) {
    const match = line.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/);
    return match ? match[0] : null;
}

function detectSeverity(line) {
    if (line.includes('FATAL') || line.includes('CRITICAL')) return 'CRITICAL';
    if (line.includes('ERROR')) return 'ERROR';
    if (line.includes('WARNING') || line.includes('WARN')) return 'WARNING';
    return 'INFO';
}
