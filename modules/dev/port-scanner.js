// modules/dev/port-scanner.js
// Scan open ports on hosts

const net = require('net');
const { promisify } = require('util');

module.exports = {
    name: "Port Scanner",
    slug: "port-scanner",
    type: "api",
    version: "1.0.0",
    description: "Scan open ports on hosts (single, range, common ports)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'scan-single-port':
                    return await scanSinglePort(params);
                case 'scan-port-range':
                    return await scanPortRange(params);
                case 'scan-common-ports':
                    return await scanCommonPorts(params);
                case 'batch-scan':
                    return await batchScan(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function scanSinglePort({ host, port, timeout = 2000 }) {
    return new Promise((resolve) => {
        if (!host || !port) {
            return resolve({ success: false, error: 'host and port are required' });
        }

        const socket = new net.Socket();
        const startTime = Date.now();

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.destroy();
            resolve({
                success: true,
                host,
                port,
                open: true,
                responseTime: Date.now() - startTime + 'ms'
            });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({
                success: true,
                host,
                port,
                open: false,
                reason: 'timeout',
                timeout
            });
        });

        socket.on('error', (error) => {
            resolve({
                success: true,
                host,
                port,
                open: false,
                reason: error.code || error.message,
                error: error.code
            });
        });

        socket.connect(port, host);
    });
}

async function scanPortRange({ host, startPort, endPort, timeout = 1000, concurrent = 5 }) {
    if (!host || !startPort || !endPort) {
        return { success: false, error: 'host, startPort, and endPort are required' };
    }

    if (startPort > endPort) {
        return { success: false, error: 'startPort must be <= endPort' };
    }

    if (endPort - startPort > 10000) {
        return { success: false, error: 'Range too large (max 10000 ports)' };
    }

    const ports = [];
    for (let p = startPort; p <= endPort; p++) {
        ports.push(p);
    }

    const results = [];
    const scanTime = Date.now();

    // Scan with concurrency limit
    for (let i = 0; i < ports.length; i += concurrent) {
        const batch = ports.slice(i, i + concurrent);
        const batchResults = await Promise.all(
            batch.map(port => scanSinglePort({ host, port, timeout }))
        );
        results.push(...batchResults);
    }

    const openPorts = results.filter(r => r.open);

    return {
        success: true,
        host,
        range: `${startPort}-${endPort}`,
        totalPorts: ports.length,
        openPorts: openPorts.length,
        openPortsList: openPorts.map(p => p.port),
        scanTime: Date.now() - scanTime + 'ms',
        results
    };
}

async function scanCommonPorts({ host, timeout = 2000 }) {
    if (!host) {
        return { success: false, error: 'host is required' };
    }

    const commonPorts = [
        20, 21,    // FTP
        22,        // SSH
        23,        // Telnet
        25,        // SMTP
        53,        // DNS
        80,        // HTTP
        110,       // POP3
        143,       // IMAP
        443,       // HTTPS
        445,       // SMB
        3306,      // MySQL
        3389,      // RDP
        5432,      // PostgreSQL
        5984,      // CouchDB
        6379,      // Redis
        8080,      // HTTP Alt
        8443,      // HTTPS Alt
        9000,      // SonicWall
        27017,     // MongoDB
        50070      // Hadoop
    ];

    const results = [];
    const scanTime = Date.now();

    for (const port of commonPorts) {
        const result = await scanSinglePort({ host, port, timeout });
        results.push(result);
    }

    const openPorts = results.filter(r => r.open);

    return {
        success: true,
        host,
        scannedPorts: commonPorts.length,
        openPorts: openPorts.length,
        openPortsList: openPorts.map(p => ({ port: p.port, service: getServiceName(p.port) })),
        scanTime: Date.now() - scanTime + 'ms',
        results
    };
}

async function batchScan({ hosts, port, timeout = 2000 }) {
    if (!hosts || !Array.isArray(hosts) || !port) {
        return { success: false, error: 'hosts (array) and port are required' };
    }

    const results = [];
    const scanTime = Date.now();

    for (const host of hosts) {
        const result = await scanSinglePort({ host, port, timeout });
        results.push(result);
    }

    const reachable = results.filter(r => r.open);

    return {
        success: true,
        port,
        totalHosts: hosts.length,
        reachableHosts: reachable.length,
        reachableList: reachable.map(r => r.host),
        scanTime: Date.now() - scanTime + 'ms',
        results
    };
}

function getServiceName(port) {
    const services = {
        20: 'FTP-DATA', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
        53: 'DNS', 80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
        445: 'SMB', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
        5984: 'CouchDB', 6379: 'Redis', 8080: 'HTTP-ALT', 8443: 'HTTPS-ALT',
        27017: 'MongoDB', 50070: 'Hadoop'
    };
    return services[port] || 'Unknown';
}
