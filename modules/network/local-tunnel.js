// modules/network/local-tunnel.js
// Expose local port to public internet (Ngrok alternative using localtunnel)

const localtunnel = require('localtunnel');
const net = require('net');

module.exports = {
    name: "Localhost Tunnel",
    slug: "local-tunnel",
    type: "api",
    version: "1.0.0",
    description: "Expose local port to public URL (Ngrok alternative)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'create':
                    return await createTunnel(params);
                case 'test-port':
                    return testPort(params);
                case 'info':
                    return getTunnelInfo();
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function createTunnel({ port, subdomain = null }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        if (port < 1 || port > 65535) {
            return { success: false, error: 'Port must be between 1-65535' };
        }

        // Check if port is accessible locally
        const portTest = await isPortListening(port);
        if (!portTest) {
            return {
                success: false,
                error: `Port ${port} is not listening locally`,
                note: 'Make sure your service is running on this port'
            };
        }

        // Create tunnel
        const tunnelOptions = {
            port,
            host: 'http://localhost'
        };

        if (subdomain) {
            tunnelOptions.subdomain = subdomain;
        }

        const tunnel = await localtunnel(tunnelOptions);

        return {
            success: true,
            message: 'Tunnel created successfully',
            publicUrl: tunnel.url,
            localPort: port,
            subdomain: tunnel.url.split('//')[1].split('.')[0],
            localAddress: `http://localhost:${port}`,
            instructions: [
                `Public URL: ${tunnel.url}`,
                'This tunnel will remain open as long as the process runs',
                'To close: Ctrl+C in the terminal running this command',
                'Each restart will generate a new URL (unless subdomain is specified)'
            ],
            keepAliveNote: 'Keep this terminal/process running to maintain the tunnel'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function testPort({ port }) {
    try {
        if (!port) {
            return { success: false, error: 'Port is required' };
        }

        return isPortListening(port).then(isListening => {
            if (isListening) {
                return {
                    success: true,
                    message: `Port ${port} is listening`,
                    port,
                    status: 'READY_FOR_TUNNEL'
                };
            } else {
                return {
                    success: false,
                    message: `Port ${port} is NOT listening`,
                    port,
                    status: 'NOT_READY',
                    suggestion: `Start your service on port ${port} first`
                };
            }
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getTunnelInfo() {
    return {
        success: true,
        name: 'Localhost Tunnel',
        description: 'Expose local ports to public internet',
        useCases: [
            'Share development environment with teammates',
            'Webhook testing from external services',
            'Rapid API integration testing',
            'Localhost access from remote machines',
            'Demo your app without deployment'
        ],
        alternatives: 'Ngrok, ssh -R, cloudflare tunnel',
        advantages: [
            'No signup required',
            'Free and open source',
            'Fast and reliable',
            'No firewall configuration needed'
        ],
        limitations: [
            'URL changes on restart (unless subdomain reserved)',
            'Requires internet connection',
            'Not recommended for production',
            'Bandwidth limited (fair use)'
        ],
        howitWorks: {
            step1: 'Detect local service running on specified port',
            step2: 'Create secure tunnel to localtunnel.me server',
            step3: 'Generate unique public URL',
            step4: 'Route traffic from public URL to local port'
        }
    };
}

/**
 * Test if a port is listening on localhost
 */
function isPortListening(port) {
    return new Promise((resolve) => {
        const socket = net.createConnection(port, 'localhost');

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('error', () => {
            resolve(false);
        });

        setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, 2000);
    });
}
