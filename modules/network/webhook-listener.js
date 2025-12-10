// modules/network/webhook-listener.js
// Mini server to capture & log incoming webhooks

const http = require('http');

// Store active webhook servers
const webhookServers = new Map();
const webhookLogs = new Map();

module.exports = {
    name: "Webhook Listener & Logger",
    slug: "webhook-listener",
    type: "api",
    version: "1.0.0",
    description: "Start mini server to capture and log incoming webhooks",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'start-server':
                    return startWebhookServer(params);
                case 'stop-server':
                    return stopWebhookServer(params);
                case 'get-logs':
                    return getWebhookLogs(params);
                case 'clear-logs':
                    return clearWebhookLogs(params);
                case 'webhook-info':
                    return getWebhookInfo(params);
                case 'export-logs':
                    return exportLogs(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function startWebhookServer({ port = 3000, path = '/webhook', host = 'localhost' }) {
    try {
        if (!port || port < 1 || port > 65535) {
            return { success: false, error: 'Port must be between 1 and 65535' };
        }

        if (webhookServers.has(port)) {
            return { success: false, error: `Webhook server already running on port ${port}` };
        }

        const server = http.createServer((req, res) => {
            const timestamp = new Date().toISOString();
            let body = '';

            // Log basic request info
            const requestLog = {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp,
                method: req.method,
                path: req.url,
                headers: req.headers,
                remoteAddress: req.socket.remoteAddress,
                remotePort: req.socket.remotePort
            };

            // Collect body data
            req.on('data', (chunk) => {
                body += chunk.toString();
            });

            req.on('end', () => {
                requestLog.body = body;
                requestLog.contentLength = body.length;

                // Try to parse as JSON
                if (body) {
                    try {
                        requestLog.jsonBody = JSON.parse(body);
                    } catch (e) {
                        // Not JSON, keep as string
                    }
                }

                // Store log
                if (!webhookLogs.has(port)) {
                    webhookLogs.set(port, []);
                }
                const logs = webhookLogs.get(port);
                logs.push(requestLog);

                // Keep only last 1000 logs
                if (logs.length > 1000) {
                    logs.shift();
                }

                // Send response
                const response = {
                    status: 'received',
                    id: requestLog.id,
                    timestamp,
                    path: req.url
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));

                console.log(`[Webhook ${port}] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
            });
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                return { success: false, error: `Port ${port} is already in use` };
            }
            throw err;
        });

        // Start server
        server.listen(port, host, () => {
            webhookServers.set(port, {
                server,
                port,
                host,
                path,
                startedAt: new Date().toISOString(),
                requestCount: 0
            });

            if (!webhookLogs.has(port)) {
                webhookLogs.set(port, []);
            }
        });

        return {
            success: true,
            port,
            host,
            path,
            message: `Webhook server started on ${host}:${port}${path}`,
            details: {
                listenAddress: `http://${host}:${port}${path}`,
                webhookUrl: `http://localhost:${port}${path}`,
                startedAt: new Date().toISOString(),
                instructions: getWebhookInstructions(port, path)
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function stopWebhookServer({ port }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        if (!webhookServers.has(port)) {
            return { success: false, error: `No webhook server running on port ${port}` };
        }

        const webhookServer = webhookServers.get(port);
        const logs = webhookLogs.get(port) || [];

        webhookServer.server.close(() => {
            webhookServers.delete(port);
        });

        return {
            success: true,
            port,
            message: `Webhook server on port ${port} stopped`,
            stats: {
                uptime: `${((new Date() - new Date(webhookServer.startedAt)) / 1000).toFixed(2)}s`,
                webhooksReceived: logs.length,
                logsPreserved: true
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getWebhookLogs({ port, limit = 50, format = 'json' }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        if (!webhookLogs.has(port)) {
            return { success: false, error: `No logs found for port ${port}` };
        }

        let logs = webhookLogs.get(port);

        // Apply limit
        if (limit && limit > 0) {
            logs = logs.slice(-limit);
        }

        if (format === 'csv') {
            // Convert to CSV format
            const csv = logs.map(log => 
                `"${log.timestamp}","${log.method}","${log.path}","${log.remoteAddress}",${log.contentLength}`
            ).join('\n');

            return {
                success: true,
                port,
                format: 'csv',
                count: logs.length,
                data: csv
            };
        }

        return {
            success: true,
            port,
            count: logs.length,
            format: 'json',
            logs,
            summary: `${logs.length} webhook(s) received`,
            methodStats: getMethodStats(logs)
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function clearWebhookLogs({ port, confirm = false }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        if (!webhookLogs.has(port)) {
            return { success: false, error: `No logs found for port ${port}` };
        }

        if (!confirm) {
            return {
                success: false,
                error: 'Confirmation required',
                message: 'Set confirm=true to clear logs'
            };
        }

        const logs = webhookLogs.get(port);
        const count = logs.length;
        webhookLogs.set(port, []);

        return {
            success: true,
            port,
            message: `Cleared ${count} webhook log(s)`,
            clearedCount: count
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getWebhookInfo({ port }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        if (!webhookServers.has(port)) {
            return { success: false, error: `No webhook server running on port ${port}` };
        }

        const server = webhookServers.get(port);
        const logs = webhookLogs.get(port) || [];

        const methodStats = getMethodStats(logs);
        const statusCodes = getStatusCodes(logs);
        const paths = getPaths(logs);

        return {
            success: true,
            port,
            server: {
                host: server.host,
                port: server.port,
                path: server.path,
                startedAt: server.startedAt,
                uptime: `${((new Date() - new Date(server.startedAt)) / 1000).toFixed(2)}s`
            },
            stats: {
                totalWebhooks: logs.length,
                methodBreakdown: methodStats,
                paths: paths,
                totalDataReceived: `${(logs.reduce((sum, log) => sum + log.contentLength, 0) / 1024).toFixed(2)} KB`,
                averagePayloadSize: `${(logs.reduce((sum, log) => sum + log.contentLength, 0) / Math.max(logs.length, 1)).toFixed(2)} bytes`
            },
            recentWebhooks: logs.slice(-5).map(log => ({
                timestamp: log.timestamp,
                method: log.method,
                path: log.path,
                size: log.contentLength
            }))
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function exportLogs({ port, format = 'json' }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        if (!webhookLogs.has(port)) {
            return { success: false, error: `No logs found for port ${port}` };
        }

        const logs = webhookLogs.get(port);

        let exportData;
        let mimeType;

        if (format === 'json') {
            exportData = JSON.stringify(logs, null, 2);
            mimeType = 'application/json';
        } else if (format === 'csv') {
            const header = 'Timestamp,Method,Path,Remote Address,Content Length\n';
            const rows = logs.map(log => 
                `"${log.timestamp}","${log.method}","${log.path}","${log.remoteAddress}",${log.contentLength}`
            ).join('\n');
            exportData = header + rows;
            mimeType = 'text/csv';
        } else if (format === 'ndjson') {
            exportData = logs.map(log => JSON.stringify(log)).join('\n');
            mimeType = 'application/x-ndjson';
        } else {
            return { success: false, error: `Unsupported format: ${format}` };
        }

        return {
            success: true,
            port,
            format,
            mimeType,
            count: logs.length,
            size: exportData.length,
            data: exportData,
            filename: `webhook-logs-${port}-${Date.now()}.${getFileExtension(format)}`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Helper functions
function getWebhookInstructions(port, path) {
    return `
Webhook server is ready to receive requests at:
  
  http://localhost:${port}${path}

Test with curl:
  curl -X POST http://localhost:${port}${path} \\
    -H "Content-Type: application/json" \\
    -d '{"event":"test","data":"hello"}'

All requests are logged and can be retrieved via API.
`;
}

function getMethodStats(logs) {
    const stats = {};
    logs.forEach(log => {
        stats[log.method] = (stats[log.method] || 0) + 1;
    });
    return stats;
}

function getStatusCodes(logs) {
    // All webhooks return 200
    return { '200': logs.length };
}

function getPaths(logs) {
    const paths = {};
    logs.forEach(log => {
        paths[log.path] = (paths[log.path] || 0) + 1;
    });
    return paths;
}

function getFileExtension(format) {
    const extensions = {
        json: 'json',
        csv: 'csv',
        ndjson: 'ndjson'
    };
    return extensions[format] || 'txt';
}
