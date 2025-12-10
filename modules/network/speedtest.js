// modules/network/speedtest.js
// Latency & bandwidth testing utility

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

module.exports = {
    name: "Speed & Latency Tester",
    slug: "speedtest",
    type: "api",
    version: "1.0.0",
    description: "Test network latency, download/upload speeds, ping",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'test-latency':
                    return await testLatency(params);
                case 'test-download':
                    return await testDownloadSpeed(params);
                case 'test-upload':
                    return await testUploadSpeed(params);
                case 'quick-test':
                    return await quickSpeedTest(params);
                case 'ping':
                    return await ping(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function testLatency({ host = 'google.com', port = 443, attempts = 5 }) {
    try {
        const latencies = [];
        let successCount = 0;

        for (let i = 0; i < attempts; i++) {
            const latency = await measureLatency(host, port);
            if (latency !== null) {
                latencies.push(latency);
                successCount++;
            }
        }

        if (successCount === 0) {
            return { success: false, error: `Could not reach ${host}:${port}` };
        }

        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const minLatency = Math.min(...latencies);
        const maxLatency = Math.max(...latencies);

        return {
            success: true,
            host,
            port,
            results: {
                attempts,
                successful: successCount,
                failed: attempts - successCount,
                latencies,
                average: parseFloat(avgLatency.toFixed(2)),
                min: parseFloat(minLatency.toFixed(2)),
                max: parseFloat(maxLatency.toFixed(2)),
                jitter: parseFloat((maxLatency - minLatency).toFixed(2))
            },
            summary: `${successCount}/${attempts} successful, avg ${avgLatency.toFixed(2)}ms`,
            quality: getLatencyQuality(avgLatency)
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function testDownloadSpeed({ url = 'https://speedtest.ftp.otenet.gr/files/test100Mb.db', sizeInMB = 100 }) {
    try {
        if (!url) {
            return { success: false, error: 'Download URL required' };
        }

        const startTime = performance.now();
        let downloadedBytes = 0;
        let speedSamples = [];
        let sampleStartTime = startTime;

        return new Promise((resolve) => {
            const protocol = url.startsWith('https') ? https : http;

            const request = protocol.get(url, (response) => {
                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    const now = performance.now();
                    const sampleDuration = (now - sampleStartTime) / 1000;

                    if (sampleDuration >= 1) {
                        const sampleSpeed = (chunk.length * 8) / (sampleDuration * 1000000);
                        speedSamples.push(sampleSpeed);
                        sampleStartTime = now;
                    }
                });

                response.on('end', () => {
                    const endTime = performance.now();
                    const totalTime = (endTime - startTime) / 1000;
                    const speedMbps = (downloadedBytes * 8) / (totalTime * 1000000);
                    const speedMBps = downloadedBytes / (totalTime * 1024 * 1024);
                    const avgSpeed = speedSamples.length > 0
                        ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
                        : speedMbps;

                    resolve({
                        success: true,
                        url: url.substring(0, 50) + (url.length > 50 ? '...' : ''),
                        results: {
                            bytesDownloaded: downloadedBytes,
                            megabytesDownloaded: parseFloat((downloadedBytes / (1024 * 1024)).toFixed(2)),
                            totalTime: parseFloat(totalTime.toFixed(2)),
                            speedMbps: parseFloat(speedMbps.toFixed(2)),
                            speedMBps: parseFloat(speedMBps.toFixed(2)),
                            averageSpeed: parseFloat(avgSpeed.toFixed(2)),
                            samples: speedSamples.length,
                            peakSpeed: speedSamples.length > 0 ? parseFloat(Math.max(...speedSamples).toFixed(2)) : speedMbps
                        },
                        summary: `Downloaded ${(downloadedBytes / (1024 * 1024)).toFixed(2)}MB at ${speedMbps.toFixed(2)}Mbps in ${totalTime.toFixed(2)}s`,
                        quality: getSpeedQuality(speedMbps)
                    });
                });

                response.on('error', (err) => {
                    resolve({ success: false, error: err.message });
                });
            });

            request.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            request.setTimeout(60000);
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function testUploadSpeed({ host = 'httpbin.org', endpoint = '/post', sizeInMB = 10 }) {
    try {
        const uploadData = Buffer.alloc(sizeInMB * 1024 * 1024, 'x');
        const startTime = performance.now();

        return new Promise((resolve) => {
            const protocol = host.startsWith('https') ? https : http;
            const url = new URL(`${host}${endpoint}`);

            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Length': uploadData.length,
                    'Content-Type': 'application/octet-stream'
                },
                timeout: 60000
            };

            const request = protocol.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    const endTime = performance.now();
                    const totalTime = (endTime - startTime) / 1000;
                    const speedMbps = (uploadData.length * 8) / (totalTime * 1000000);
                    const speedMBps = uploadData.length / (totalTime * 1024 * 1024);

                    resolve({
                        success: true,
                        host,
                        endpoint,
                        results: {
                            bytesUploaded: uploadData.length,
                            megabytesUploaded: sizeInMB,
                            totalTime: parseFloat(totalTime.toFixed(2)),
                            speedMbps: parseFloat(speedMbps.toFixed(2)),
                            speedMBps: parseFloat(speedMBps.toFixed(2))
                        },
                        summary: `Uploaded ${sizeInMB}MB at ${speedMbps.toFixed(2)}Mbps in ${totalTime.toFixed(2)}s`,
                        quality: getSpeedQuality(speedMbps)
                    });
                });
            });

            request.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            request.write(uploadData);
            request.end();
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function quickSpeedTest({ testLatencyHost = 'google.com', downloadUrl = 'https://speedtest.ftp.otenet.gr/files/test10Mb.db' }) {
    try {
        const results = {};

        // Test latency
        const latencyResult = await testLatency({ host: testLatencyHost, attempts: 3 });
        results.latency = latencyResult;

        // Test download (smaller file for quick test)
        const downloadResult = await testDownloadSpeed({ url: downloadUrl });
        results.download = downloadResult;

        return {
            success: true,
            results,
            summary: {
                latency: latencyResult.success ? `${latencyResult.results.average}ms` : 'Failed',
                download: downloadResult.success ? `${downloadResult.results.speedMbps}Mbps` : 'Failed',
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function ping({ host = 'google.com', timeout = 5000 }) {
    try {
        const startTime = performance.now();

        return new Promise((resolve) => {
            const protocol = https;
            const request = protocol.get(`https://${host}`, { timeout }, (response) => {
                const endTime = performance.now();
                const latency = endTime - startTime;

                resolve({
                    success: true,
                    host,
                    statusCode: response.statusCode,
                    latency: parseFloat(latency.toFixed(2)),
                    unit: 'ms',
                    message: `${host} is reachable (${latency.toFixed(2)}ms)`,
                    quality: getLatencyQuality(latency)
                });
            });

            request.on('error', (err) => {
                resolve({
                    success: false,
                    host,
                    error: err.message,
                    message: `${host} is unreachable`
                });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function measureLatency(host, port) {
    try {
        const startTime = performance.now();
        const net = require('net');
        const socket = net.createConnection({ host, port, timeout: 5000 });

        return new Promise((resolve) => {
            socket.on('connect', () => {
                const endTime = performance.now();
                socket.destroy();
                resolve(endTime - startTime);
            });

            socket.on('error', () => {
                resolve(null);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(null);
            });
        });
    } catch (error) {
        return null;
    }
}

function getLatencyQuality(latency) {
    if (latency < 50) return 'Excellent';
    if (latency < 100) return 'Good';
    if (latency < 150) return 'Fair';
    if (latency < 300) return 'Poor';
    return 'Very Poor';
}

function getSpeedQuality(mbps) {
    if (mbps > 100) return '🚀 Excellent';
    if (mbps > 50) return '✅ Good';
    if (mbps > 25) return '⚠️ Fair';
    if (mbps > 10) return '🐢 Slow';
    return '❌ Very Slow';
}
