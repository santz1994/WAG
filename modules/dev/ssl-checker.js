// modules/dev/ssl-checker.js
// Check SSL certificate information

const https = require('https');
const tls = require('tls');

module.exports = {
    name: "SSL Certificate Checker",
    slug: "ssl-checker",
    type: "api",
    version: "1.0.0",
    description: "Check SSL certificates, validity, expiry dates",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'get-cert-info':
                    return await getCertInfo(params);
                case 'validate-cert':
                    return await validateCert(params);
                case 'check-expiry':
                    return await checkExpiry(params);
                case 'monitor-expiry':
                    return await monitorExpiry(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function getCertInfo({ host, port = 443 }) {
    return new Promise((resolve) => {
        if (!host) {
            return resolve({ success: false, error: 'host is required' });
        }

        try {
            const options = {
                hostname: host,
                port: port,
                rejectUnauthorized: false
            };

            const req = https.request(options, (res) => {
                const cert = res.socket.getPeerCertificate();
                
                if (!cert || !cert.subject) {
                    return resolve({
                        success: false,
                        message: 'No certificate found',
                        host,
                        port
                    });
                }

                const info = {
                    subject: cert.subject,
                    issuer: cert.issuer,
                    validFrom: cert.valid_from,
                    validTo: cert.valid_to,
                    serialNumber: cert.serialNumber,
                    fingerprint: cert.fingerprint,
                    fingerprint256: cert.fingerprint256,
                    publicKeySize: cert.bits,
                    signatureAlgorithm: cert.sigalg,
                    extensions: cert.extensions ? Object.keys(cert.extensions) : []
                };

                const now = new Date();
                const validToDate = new Date(cert.valid_to);

                resolve({
                    success: true,
                    host,
                    port,
                    certificate: info,
                    validity: {
                        valid: validToDate > now,
                        expiresAt: cert.valid_to,
                        daysUntilExpiry: Math.floor((validToDate - now) / (1000 * 60 * 60 * 24))
                    }
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    host,
                    port
                });
            });

            req.setTimeout(5000, () => {
                req.destroy();
                resolve({
                    success: false,
                    error: 'Connection timeout',
                    host,
                    port
                });
            });

            req.end();
        } catch (error) {
            resolve({ success: false, error: error.message });
        }
    });
}

async function validateCert({ host, port = 443 }) {
    return new Promise((resolve) => {
        if (!host) {
            return resolve({ success: false, error: 'host is required' });
        }

        try {
            const options = {
                hostname: host,
                port: port,
                rejectUnauthorized: true
            };

            const req = https.request(options, (res) => {
                const cert = res.socket.getPeerCertificate();
                const now = new Date();
                const validToDate = new Date(cert.valid_to);
                const validFromDate = new Date(cert.valid_from);

                const validation = {
                    hostnameMatch: cert.subject.CN === host,
                    withinValidityPeriod: now > validFromDate && now < validToDate,
                    expired: validToDate < now,
                    notYetValid: now < validFromDate,
                    validFrom: cert.valid_from,
                    validTo: cert.valid_to,
                    issuer: cert.issuer
                };

                resolve({
                    success: true,
                    host,
                    port,
                    valid: validation.withinValidityPeriod && validation.hostnameMatch,
                    validation
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    host,
                    port,
                    valid: false,
                    error: error.message || error.code
                });
            });

            req.setTimeout(5000);
            req.end();
        } catch (error) {
            resolve({ success: false, error: error.message });
        }
    });
}

async function checkExpiry({ host, port = 443, warningDays = 30 }) {
    return new Promise((resolve) => {
        if (!host) {
            return resolve({ success: false, error: 'host is required' });
        }

        try {
            const options = {
                hostname: host,
                port: port,
                rejectUnauthorized: false
            };

            const req = https.request(options, (res) => {
                const cert = res.socket.getPeerCertificate();
                const validToDate = new Date(cert.valid_to);
                const now = new Date();
                const daysUntilExpiry = Math.floor((validToDate - now) / (1000 * 60 * 60 * 24));

                resolve({
                    success: true,
                    host,
                    port,
                    expiresAt: cert.valid_to,
                    daysUntilExpiry,
                    expired: daysUntilExpiry < 0,
                    needsRenewal: daysUntilExpiry < warningDays,
                    warningThreshold: warningDays + ' days'
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    host,
                    port
                });
            });

            req.setTimeout(5000);
            req.end();
        } catch (error) {
            resolve({ success: false, error: error.message });
        }
    });
}

async function monitorExpiry({ hosts, port = 443, warningDays = 30 }) {
    if (!hosts || !Array.isArray(hosts)) {
        return { success: false, error: 'hosts (array) is required' };
    }

    const results = [];

    for (const host of hosts) {
        const result = await checkExpiry({ host, port, warningDays });
        results.push({
            host,
            ...result
        });
    }

    const expiring = results.filter(r => r.needsRenewal && !r.expired);
    const expired = results.filter(r => r.expired);

    return {
        success: true,
        totalHosts: hosts.length,
        healthy: results.filter(r => !r.needsRenewal).length,
        expiring: expiring.length,
        expired: expired.length,
        expiringList: expiring.map(r => ({ host: r.host, daysUntilExpiry: r.daysUntilExpiry })),
        expiredList: expired.map(r => ({ host: r.host, expiresAt: r.expiresAt })),
        results
    };
}
