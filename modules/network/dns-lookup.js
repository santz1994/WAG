// modules/network/dns-lookup.js
// DNS record lookup (A, MX, TXT, NS, CNAME, SOA)

const dns = require('dns').promises;
const { Resolver } = require('dns');

module.exports = {
    name: "DNS Lookup & Propagator",
    slug: "dns-lookup",
    type: "api",
    version: "1.0.0",
    description: "Lookup DNS records from multiple servers",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'lookup':
                    return await dnsLookup(params);
                case 'check-propagation':
                    return await checkPropagation(params);
                case 'reverse-dns':
                    return await reverseDNS(params);
                case 'global-dns':
                    return await globalDNSLookup(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function dnsLookup({ domain, recordType = 'ALL' }) {
    try {
        if (!domain) {
            return { success: false, error: 'Domain is required' };
        }

        const results = {};
        const validTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'SRV', 'ALL'];

        if (!validTypes.includes(recordType)) {
            return { success: false, error: `Record type must be one of: ${validTypes.join(', ')}` };
        }

        const typesToLookup = recordType === 'ALL' 
            ? ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME']
            : [recordType];

        for (const type of typesToLookup) {
            try {
                let records;
                switch (type) {
                    case 'A':
                        records = await dns.resolve4(domain);
                        break;
                    case 'AAAA':
                        records = await dns.resolve6(domain);
                        break;
                    case 'MX':
                        records = await dns.resolveMx(domain);
                        break;
                    case 'TXT':
                        records = await dns.resolveTxt(domain);
                        break;
                    case 'NS':
                        records = await dns.resolveNs(domain);
                        break;
                    case 'CNAME':
                        records = await dns.resolveCname(domain);
                        break;
                }
                if (records && records.length > 0) {
                    results[type] = records;
                }
            } catch (e) {
                // Record type not found, skip
            }
        }

        return {
            success: true,
            domain,
            records: results,
            recordCount: Object.keys(results).length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function reverseDNS({ ipAddress }) {
    try {
        if (!ipAddress) {
            return { success: false, error: 'IP address is required' };
        }

        const hostname = await dns.reverse(ipAddress);

        return {
            success: true,
            ipAddress,
            hostname,
            message: 'Reverse DNS lookup completed'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function checkPropagation({ domain, recordType = 'A' }) {
    try {
        if (!domain) {
            return { success: false, error: 'Domain is required' };
        }

        // Public DNS servers to check against
        const publicDNSServers = [
            { name: 'Google', ip: '8.8.8.8' },
            { name: 'Cloudflare', ip: '1.1.1.1' },
            { name: 'OpenDNS', ip: '208.67.222.222' },
            { name: 'Quad9', ip: '9.9.9.9' }
        ];

        const results = {};

        for (const dnsServer of publicDNSServers) {
            try {
                const resolver = new Resolver();
                resolver.setServers([dnsServer.ip]);

                let records;
                switch (recordType) {
                    case 'A':
                        records = await resolver.resolve4(domain);
                        break;
                    case 'MX':
                        records = await resolver.resolveMx(domain);
                        break;
                    default:
                        records = await resolver.resolve4(domain);
                }

                results[dnsServer.name] = {
                    propagated: true,
                    records: records,
                    server: dnsServer.ip
                };
            } catch (e) {
                results[dnsServer.name] = {
                    propagated: false,
                    error: e.message,
                    server: dnsServer.ip
                };
            }
        }

        // Check if fully propagated
        const propagated = Object.values(results).every(r => r.propagated);

        return {
            success: true,
            domain,
            recordType,
            results,
            fullyPropagated: propagated,
            propagationPercentage: `${Math.round((Object.values(results).filter(r => r.propagated).length / publicDNSServers.length) * 100)}%`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function globalDNSLookup({ domain }) {
    try {
        if (!domain) {
            return { success: false, error: 'Domain is required' };
        }

        // Lookup from default DNS
        const lookup = await dnsLookup({ domain, recordType: 'ALL' });

        // Check propagation
        const propagation = await checkPropagation({ domain, recordType: 'A' });

        return {
            success: true,
            domain,
            localLookup: lookup.records,
            globalPropagation: propagation.results,
            summary: {
                recordTypes: Object.keys(lookup.records),
                fullyPropagated: propagation.fullyPropagated,
                propagationPercentage: propagation.propagationPercentage
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
