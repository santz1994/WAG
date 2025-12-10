// modules/crypto/crypto-converter.js
// Convert between crypto units (Wei, Gwei, Ether, Satoshi)

module.exports = {
    name: "Crypto Unit Converter",
    slug: "crypto-converter",
    type: "api",
    version: "1.0.0",
    description: "Convert between Wei, Gwei, Ether, and Satoshi units",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'convert':
                    return convertUnits(params);
                case 'batch-convert':
                    return batchConvert(params);
                case 'quick-convert':
                    return quickConvert(params);
                case 'get-rates':
                    return getRates(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

const UNITS = {
    'wei': 1n,
    'gwei': 1000000000n,
    'ether': 1000000000000000000n,
    'satoshi': 1n,
    'mbtc': 100000n,
    'btc': 100000000n
};

function convertUnits({ value, fromUnit, toUnit }) {
    try {
        if (!value || !fromUnit || !toUnit) {
            return { success: false, error: 'value, fromUnit, and toUnit are required' };
        }

        fromUnit = fromUnit.toLowerCase();
        toUnit = toUnit.toLowerCase();

        if (!UNITS[fromUnit] || !UNITS[toUnit]) {
            return { success: false, error: `Invalid unit. Supported: ${Object.keys(UNITS).join(', ')}` };
        }

        // Convert string to BigInt to avoid precision loss
        let numValue;
        try {
            numValue = BigInt(value.toString().replace(/[^0-9]/g, ''));
        } catch {
            // Try float conversion
            numValue = BigInt(Math.floor(parseFloat(value)));
        }

        // Convert to wei/satoshi first, then to target
        const inBaseUnit = (numValue * UNITS[fromUnit]) / UNITS[fromUnit];
        const result = (inBaseUnit * UNITS[toUnit]) / UNITS[toUnit];

        // For display, use string representation
        const resultStr = result.toString();
        const displayValue = (numValue * UNITS[fromUnit] / UNITS[toUnit]).toString();

        return {
            success: true,
            input: value,
            fromUnit,
            toUnit,
            result: displayValue,
            exact: resultStr,
            formatted: formatNumber(displayValue),
            note: 'Use "exact" for precision, "result" for general use'
        };
    } catch (error) {
        throw error;
    }
}

function batchConvert({ conversions }) {
    try {
        if (!Array.isArray(conversions)) {
            return { success: false, error: 'conversions must be an array' };
        }

        const results = conversions.map(conv => {
            try {
                const result = convertUnits(conv);
                return { ...conv, ...result };
            } catch (err) {
                return { ...conv, success: false, error: err.message };
            }
        });

        const successful = results.filter(r => r.success).length;

        return {
            success: true,
            totalConversions: conversions.length,
            successful,
            failed: conversions.length - successful,
            results
        };
    } catch (error) {
        throw error;
    }
}

function quickConvert({ value, from, to }) {
    // Quick shorthand: ETH -> GWEI, BTC -> SATOSHI, etc
    try {
        if (!value) return { success: false, error: 'value is required' };

        const quickMaps = {
            'eth-gwei': { from: 'ether', to: 'gwei' },
            'eth-wei': { from: 'ether', to: 'wei' },
            'gwei-wei': { from: 'gwei', to: 'wei' },
            'btc-satoshi': { from: 'btc', to: 'satoshi' },
            'btc-mbtc': { from: 'btc', to: 'mbtc' }
        };

        const key = `${from}-${to}`.toLowerCase();
        const mapping = quickMaps[key];

        if (!mapping) {
            return { success: false, error: `Unknown conversion. Try: ${Object.keys(quickMaps).join(', ')}` };
        }

        return convertUnits({
            value,
            fromUnit: mapping.from,
            toUnit: mapping.to
        });
    } catch (error) {
        throw error;
    }
}

function getRates() {
    try {
        return {
            success: true,
            message: 'Conversion rates (1 unit)',
            rates: {
                ethereum: {
                    '1 Ether = 1,000,000,000 Gwei': true,
                    '1 Gwei = 1,000,000,000 Wei': true,
                    '1 Ether = 1,000,000,000,000,000,000 Wei': true
                },
                bitcoin: {
                    '1 BTC = 100,000,000 Satoshi': true,
                    '1 BTC = 1,000 mBTC': true,
                    '1 mBTC = 100,000 Satoshi': true
                }
            },
            supportedUnits: Object.keys(UNITS),
            note: 'These are fixed conversion rates (not market prices)'
        };
    } catch (error) {
        throw error;
    }
}

function formatNumber(numStr) {
    try {
        const num = parseFloat(numStr);
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    } catch {
        return numStr;
    }
}
