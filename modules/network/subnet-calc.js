// modules/network/subnet-calc.js
// CIDR netmask calculator for network planning

const IpCidr = require('ip-cidr');

module.exports = {
    name: "Subnet Calculator",
    slug: "subnet-calc",
    type: "api",
    version: "1.0.0",
    description: "Calculate CIDR ranges, netmasks, usable IPs",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'calculate-cidr':
                    return calculateCIDR(params);
                case 'parse-netmask':
                    return parseNetmask(params);
                case 'find-range':
                    return findRange(params);
                case 'check-overlap':
                    return checkOverlap(params);
                case 'split-subnet':
                    return splitSubnet(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function calculateCIDR({ cidr }) {
    try {
        if (!cidr) {
            return { success: false, error: 'CIDR notation required (e.g., 192.168.1.0/24)' };
        }

        const ipCidr = new IpCidr(cidr);

        if (!ipCidr.isValid()) {
            return { success: false, error: 'Invalid CIDR notation' };
        }

        const range = ipCidr.toArray();
        const firstAddress = ipCidr.getFirstIp();
        const lastAddress = ipCidr.getLastIp();
        const broadcastAddress = ipCidr.getBroadcastAddress();
        const netmask = ipCidr.getNetmask();
        const prefixLength = ipCidr.getPrefixLength();
        const totalHosts = ipCidr.getAddressCount();
        const usableHosts = Math.max(0, totalHosts - 2);

        return {
            success: true,
            cidr,
            networkAddress: firstAddress,
            broadcastAddress,
            netmask,
            prefixLength,
            totalHosts,
            usableHosts,
            firstUsableIP: usableHosts > 0 ? getNextIP(firstAddress) : firstAddress,
            lastUsableIP: usableHosts > 0 ? getPreviousIP(lastAddress) : lastAddress,
            addressRange: usableHosts > 0 ? `${getNextIP(firstAddress)} - ${getPreviousIP(lastAddress)}` : 'None',
            summary: {
                class: getIPClass(firstAddress),
                type: totalHosts <= 2 ? 'Point-to-point' : 'Subnet',
                size: getSizeCategory(totalHosts)
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function parseNetmask({ ipAddress, netmask }) {
    try {
        if (!ipAddress || !netmask) {
            return { success: false, error: 'IP address and netmask required' };
        }

        // Convert netmask to CIDR notation
        const cidrNotation = `${ipAddress}/${netmaskToCIDR(netmask)}`;
        const ipCidr = new IpCidr(cidrNotation);

        if (!ipCidr.isValid()) {
            return { success: false, error: 'Invalid IP address or netmask' };
        }

        return {
            success: true,
            ipAddress,
            netmask,
            cidrNotation,
            ...calculateCIDR({ cidr: cidrNotation }).data
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function findRange({ startIP, endIP }) {
    try {
        if (!startIP || !endIP) {
            return { success: false, error: 'Start and end IP addresses required' };
        }

        // Find all possible subnets that cover both IPs
        const subnets = [];

        for (let prefix = 1; prefix <= 32; prefix++) {
            // Create test CIDR blocks
            const testCIDR = `${startIP}/${prefix}`;
            try {
                const ipCidr = new IpCidr(testCIDR);
                const rangeArray = ipCidr.toArray();

                // Check if both IPs are in this range
                if (rangeArray.includes(startIP) && rangeArray.includes(endIP)) {
                    subnets.push({
                        cidr: testCIDR,
                        networkAddress: ipCidr.getFirstIp(),
                        broadcastAddress: ipCidr.getBroadcastAddress(),
                        totalHosts: ipCidr.getAddressCount(),
                        netmask: ipCidr.getNetmask()
                    });
                }
            } catch (e) {
                // Skip invalid ranges
            }
        }

        if (subnets.length === 0) {
            return { success: false, error: 'No valid subnet found containing both IPs' };
        }

        // Return smallest subnet that contains both IPs
        const smallest = subnets[subnets.length - 1];

        return {
            success: true,
            startIP,
            endIP,
            smallestCIDR: smallest.cidr,
            largestCIDR: subnets[0].cidr,
            allCIDRs: subnets.map(s => s.cidr),
            recommended: smallest
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function checkOverlap({ cidrs }) {
    try {
        if (!Array.isArray(cidrs) || cidrs.length < 2) {
            return { success: false, error: 'At least 2 CIDR blocks required' };
        }

        const parsed = cidrs.map(cidr => {
            try {
                return new IpCidr(cidr);
            } catch (e) {
                throw new Error(`Invalid CIDR: ${cidr}`);
            }
        });

        const overlaps = [];

        for (let i = 0; i < parsed.length; i++) {
            for (let j = i + 1; j < parsed.length; j++) {
                const range1 = parsed[i].toArray();
                const range2 = parsed[j].toArray();

                const overlap = range1.some(ip => range2.includes(ip));
                if (overlap) {
                    overlaps.push({
                        cidr1: cidrs[i],
                        cidr2: cidrs[j],
                        overlaps: true
                    });
                }
            }
        }

        return {
            success: true,
            cidrsChecked: cidrs,
            overlaps: overlaps,
            hasOverlap: overlaps.length > 0,
            message: overlaps.length > 0 ? `Found ${overlaps.length} overlapping CIDR pairs` : 'No overlaps detected'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function splitSubnet({ cidr, newPrefixLength }) {
    try {
        if (!cidr || !newPrefixLength) {
            return { success: false, error: 'CIDR and new prefix length required' };
        }

        const ipCidr = new IpCidr(cidr);

        if (!ipCidr.isValid()) {
            return { success: false, error: 'Invalid CIDR notation' };
        }

        const currentPrefix = ipCidr.getPrefixLength();

        if (newPrefixLength <= currentPrefix) {
            return { success: false, error: `New prefix length must be greater than current (${currentPrefix})` };
        }

        if (newPrefixLength > 32) {
            return { success: false, error: 'Prefix length cannot exceed 32' };
        }

        // Calculate subnets
        const subnetsCount = Math.pow(2, newPrefixLength - currentPrefix);
        const subnets = [];
        const currentRange = ipCidr.toArray();
        const hostsPerSubnet = Math.pow(2, 32 - newPrefixLength);

        let ipIndex = 0;
        for (let i = 0; i < subnetsCount && ipIndex < currentRange.length; i++) {
            const subnetCIDR = `${currentRange[ipIndex]}/${newPrefixLength}`;
            try {
                const subnetIpCidr = new IpCidr(subnetCIDR);
                subnets.push({
                    cidr: subnetCIDR,
                    networkAddress: subnetIpCidr.getFirstIp(),
                    broadcastAddress: subnetIpCidr.getBroadcastAddress(),
                    netmask: subnetIpCidr.getNetmask(),
                    usableHosts: Math.max(0, subnetIpCidr.getAddressCount() - 2)
                });
            } catch (e) {
                // Skip
            }
            ipIndex += hostsPerSubnet;
        }

        return {
            success: true,
            originalCIDR: cidr,
            newPrefixLength,
            subnetCount: subnets.length,
            subnets,
            summary: `Split into ${subnets.length} subnets with /${newPrefixLength} prefix`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Helper functions
function netmaskToCIDR(netmask) {
    const parts = netmask.split('.');
    let binary = '';
    for (const part of parts) {
        binary += parseInt(part).toString(2).padStart(8, '0');
    }
    return binary.lastIndexOf('1') + 1;
}

function getNextIP(ip) {
    const parts = ip.split('.');
    let num = (parseInt(parts[0]) * 16777216) + (parseInt(parts[1]) * 65536) + (parseInt(parts[2]) * 256) + parseInt(parts[3]);
    num++;
    return `${Math.floor(num / 16777216)}.${Math.floor((num % 16777216) / 65536)}.${Math.floor((num % 65536) / 256)}.${num % 256}`;
}

function getPreviousIP(ip) {
    const parts = ip.split('.');
    let num = (parseInt(parts[0]) * 16777216) + (parseInt(parts[1]) * 65536) + (parseInt(parts[2]) * 256) + parseInt(parts[3]);
    num--;
    return `${Math.floor(num / 16777216)}.${Math.floor((num % 16777216) / 65536)}.${Math.floor((num % 65536) / 256)}.${num % 256}`;
}

function getIPClass(ip) {
    const first = parseInt(ip.split('.')[0]);
    if (first < 128) return 'Class A';
    if (first < 192) return 'Class B';
    if (first < 224) return 'Class C';
    if (first < 240) return 'Class D (Multicast)';
    return 'Class E (Reserved)';
}

function getSizeCategory(count) {
    if (count <= 2) return 'Point-to-point';
    if (count <= 4) return 'Tiny';
    if (count <= 16) return 'Small';
    if (count <= 256) return 'Medium';
    if (count <= 65536) return 'Large';
    return 'Very Large';
}
