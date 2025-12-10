// modules/network/port-listener.js
// Port listener for firewall & network testing

const net = require('net');
const { EventEmitter } = require('events');

// Store active listeners
const activeListeners = new Map();

module.exports = {
    name: "Port Listener & Tester",
    slug: "port-listener",
    type: "api",
    version: "1.0.0",
    description: "Listen on ports for firewall testing and network diagnostics",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'start-listener':
                    return startListener(params);
                case 'stop-listener':
                    return stopListener(params);
                case 'test-connection':
                    return await testConnection(params);
                case 'list-listeners':
                    return listListeners();
                case 'get-listener-info':
                    return getListenerInfo(params);
                case 'simulate-service':
                    return simulateService(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function startListener({ port, host = 'localhost', backlog = 128, timeout = 300000, serviceType = 'echo' }) {
    try {
        if (!port || port < 1 || port > 65535) {
            return { success: false, error: 'Port must be between 1 and 65535' };
        }

        if (activeListeners.has(port)) {
            return { success: false, error: `Port ${port} is already listening` };
        }

        const server = net.createServer();
        let connectionCount = 0;
        const connections = new Map();

        // Handle incoming connections
        server.on('connection', (socket) => {
            connectionCount++;
            const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            connections.set(connectionId, {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                connectedAt: new Date().toISOString(),
                bytesReceived: 0,
                bytesSent: 0
            });

            const connection = connections.get(connectionId);

            // Handle socket events
            socket.on('data', (data) => {
                connection.bytesReceived += data.length;

                switch (serviceType) {
                    case 'echo':
                        // Echo back the data
                        const response = data;
                        socket.write(response);
                        connection.bytesSent += response.length;
                        break;

                    case 'http':
                        // Simulate basic HTTP server
                        const httpResponse = 'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 13\r\n\r\nPort is open!';
                        socket.write(httpResponse);
                        connection.bytesSent += httpResponse.length;
                        socket.end();
                        break;

                    case 'banner':
                        // Send banner message
                        const banner = `Welcome to port ${port} listener\r\n`;
                        socket.write(banner);
                        connection.bytesSent += banner.length;
                        break;

                    case 'discard':
                        // Discard all data (like discard protocol)
                        break;

                    case 'time':
                        // Send current time
                        const timeResponse = `Time: ${new Date().toISOString()}\r\n`;
                        socket.write(timeResponse);
                        connection.bytesSent += timeResponse.length;
                        break;

                    case 'silent':
                        // Don't respond at all
                        break;
                }
            });

            socket.on('error', (err) => {
                connection.error = err.message;
            });

            socket.on('end', () => {
                connection.disconnectedAt = new Date().toISOString();
                setTimeout(() => connections.delete(connectionId), 60000);
            });

            socket.setTimeout(timeout, () => {
                socket.destroy();
            });
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                return { success: false, error: `Port ${port} is already in use` };
            }
            throw err;
        });

        // Start listening
        server.listen(port, host, backlog, () => {
            activeListeners.set(port, {
                server,
                port,
                host,
                startedAt: new Date().toISOString(),
                serviceType,
                connectionCount: 0,
                connections,
                bytesTransferred: 0
            });
        });

        return {
            success: true,
            port,
            host,
            serviceType,
            message: `Listening on ${host}:${port}`,
            details: {
                listeningAddress: `${host}:${port}`,
                serviceType,
                backlog,
                timeout,
                instructions: getServiceInstructions(port, serviceType)
            },
            startedAt: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function stopListener({ port }) {
    try {
        if (!port) {
            return { success: false, error: 'Port number required' };
        }

        if (!activeListeners.has(port)) {
            return { success: false, error: `No listener found on port ${port}` };
        }

        const listener = activeListeners.get(port);
        const { server, connections, startedAt } = listener;

        // Close all connections
        connections.forEach((conn, id) => {
            connections.delete(id);
        });

        // Close server
        server.close(() => {
            activeListeners.delete(port);
        });

        const uptime = new Date() - new Date(startedAt);

        return {
            success: true,
            port,
            message: `Stopped listening on port ${port}`,
            stats: {
                uptime: `${(uptime / 1000).toFixed(2)}s`,
                totalConnections: listener.connectionCount,
                activeConnections: connections.size
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function testConnection({ host = 'localhost', port, timeout = 5000 }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        return new Promise((resolve) => {
            const socket = net.createConnection({ host, port, timeout });
            const startTime = Date.now();

            socket.on('connect', () => {
                const latency = Date.now() - startTime;
                socket.destroy();
                resolve({
                    success: true,
                    host,
                    port,
                    status: 'Open',
                    latency,
                    unit: 'ms',
                    message: `Successfully connected to ${host}:${port} in ${latency}ms`
                });
            });

            socket.on('error', (err) => {
                resolve({
                    success: false,
                    host,
                    port,
                    status: 'Closed/Filtered',
                    error: err.message,
                    errorCode: err.code,
                    message: `Cannot connect to ${host}:${port}`
                });
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve({
                    success: false,
                    host,
                    port,
                    status: 'Timeout',
                    message: `Connection timeout to ${host}:${port}`,
                    timeout
                });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function listListeners() {
    try {
        const listeners = [];

        activeListeners.forEach((listener, port) => {
            listeners.push({
                port,
                host: listener.host,
                serviceType: listener.serviceType,
                startedAt: listener.startedAt,
                uptime: new Date() - new Date(listener.startedAt),
                activeConnections: listener.connections.size
            });
        });

        return {
            success: true,
            totalListeners: listeners.length,
            listeners,
            summary: `${listeners.length} port listener(s) active`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getListenerInfo({ port }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        if (!activeListeners.has(port)) {
            return { success: false, error: `No listener found on port ${port}` };
        }

        const listener = activeListeners.get(port);
        const connectionDetails = [];

        listener.connections.forEach((conn, id) => {
            connectionDetails.push({
                id,
                ...conn
            });
        });

        return {
            success: true,
            port,
            info: {
                host: listener.host,
                serviceType: listener.serviceType,
                startedAt: listener.startedAt,
                uptime: `${((new Date() - new Date(listener.startedAt)) / 1000).toFixed(2)}s`,
                activeConnections: listener.connections.size,
                totalConnections: listener.connectionCount
            },
            connections: connectionDetails
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function simulateService({ port, serviceType = 'echo', duration = 300 }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        const result = startListener({ port, serviceType, timeout: duration * 1000 });

        if (result.success) {
            // Auto-stop after duration
            if (duration) {
                setTimeout(() => {
                    stopListener({ port });
                }, duration * 1000);
            }

            return {
                ...result,
                autoStop: `Will stop after ${duration} seconds`,
                testCommand: getTestCommand(port, serviceType)
            };
        }

        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getServiceInstructions(port, serviceType) {
    const instructions = {
        echo: `Send any data, it will be echoed back. Test with: echo "hello" | nc localhost ${port}`,
        http: `Simple HTTP server. Test with: curl http://localhost:${port}`,
        banner: `Returns banner on connect. Test with: nc localhost ${port}`,
        discard: `Silently discards all data (RFC 863). Test with: nc localhost ${port}`,
        time: `Returns current time. Test with: nc localhost ${port}`,
        silent: `Accepts connections but doesn't respond. Test with: nc localhost ${port}`
    };

    return instructions[serviceType] || 'Unknown service type';
}

function getTestCommand(port, serviceType) {
    const commands = {
        echo: `echo "test" | nc localhost ${port}`,
        http: `curl http://localhost:${port}`,
        banner: `nc localhost ${port}`,
        discard: `echo "data" | nc localhost ${port}`,
        time: `nc localhost ${port}`,
        silent: `timeout 2 nc localhost ${port} || echo "Connection established"`
    };

    return commands[serviceType] || '';
}
