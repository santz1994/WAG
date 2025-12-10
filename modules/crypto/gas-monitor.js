// modules/crypto/gas-monitor.js
// Monitor gas prices on multiple blockchain networks

const axios = require('axios');

module.exports = {
    name: "Gas Price Monitor",
    slug: "gas-monitor",
    type: "api",
    version: "1.0.0",
    description: "Monitor gas prices across ETH, Polygon, BSC networks",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'get-gas-price':
                    return await getGasPrice(params);
                case 'monitor-multiple':
                    return await monitorMultiple(params);
                case 'estimate-transaction':
                    return await estimateTransaction(params);
                case 'gas-history':
                    return await getGasHistory(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function getGasPrice({ network = 'ethereum' }) {
    try {
        const networks = {
            'ethereum': {
                name: 'Ethereum',
                rpc: 'https://eth-mainnet.g.alchemy.com/v2/demo',
                blockTime: 12,
                nativeCurrency: 'ETH'
            },
            'polygon': {
                name: 'Polygon',
                rpc: 'https://polygon-rpc.com',
                blockTime: 2,
                nativeCurrency: 'MATIC'
            },
            'bsc': {
                name: 'BSC',
                rpc: 'https://bsc-dataseed.binance.org',
                blockTime: 3,
                nativeCurrency: 'BNB'
            }
        };

        if (!networks[network]) {
            return { success: false, error: `Unknown network. Supported: ${Object.keys(networks).join(', ')}` };
        }

        const netInfo = networks[network];

        // Simulate gas prices (in production, would fetch from actual RPC)
        const mockPrices = {
            'ethereum': { slow: 30, standard: 50, fast: 100 },
            'polygon': { slow: 31, standard: 50, fast: 80 },
            'bsc': { slow: 3, standard: 5, fast: 8 }
        };

        const gasPrices = mockPrices[network];

        return {
            success: true,
            network: netInfo.name,
            gasPrice: {
                slow: { gwei: gasPrices.slow, standard: `${gasPrices.slow} Gwei` },
                standard: { gwei: gasPrices.standard, standard: `${gasPrices.standard} Gwei` },
                fast: { gwei: gasPrices.fast, standard: `${gasPrices.fast} Gwei` }
            },
            recommendation: gasPrices.standard,
            blockTime: `${netInfo.blockTime}s`,
            currency: netInfo.nativeCurrency,
            timestamp: new Date().toISOString(),
            note: 'Gas prices are simulated. Use actual RPC endpoints for real data.'
        };
    } catch (error) {
        throw error;
    }
}

async function monitorMultiple({ networks = ['ethereum', 'polygon', 'bsc'] }) {
    try {
        if (!Array.isArray(networks)) {
            return { success: false, error: 'networks must be an array' };
        }

        const results = [];
        for (const network of networks) {
            try {
                const result = await getGasPrice({ network });
                if (result.success) {
                    results.push(result);
                }
            } catch (err) {
                results.push({
                    network,
                    success: false,
                    error: err.message
                });
            }
        }

        // Find cheapest network
        const validResults = results.filter(r => r.success);
        const cheapest = validResults.length > 0 
            ? validResults.reduce((min, r) => 
                r.gasPrice.standard.gwei < min.gasPrice.standard.gwei ? r : min
            )
            : null;

        return {
            success: true,
            totalNetworks: networks.length,
            monitoredNetworks: validResults.length,
            results,
            cheapestNetwork: cheapest ? cheapest.network : 'N/A',
            bestForTransactions: cheapest ? cheapest.network : 'Unable to determine'
        };
    } catch (error) {
        throw error;
    }
}

async function estimateTransaction({ gasLimit = 21000, gasPrice, network = 'ethereum', tokenValue = null }) {
    try {
        if (!gasPrice) {
            return { success: false, error: 'gasPrice is required (in gwei)' };
        }

        // Calculate transaction cost
        const costInGwei = gasLimit * gasPrice;
        const costInEther = costInGwei / 1e9;
        
        // Estimate cost in USD (mock ETH price)
        const ethUsdPrice = 2500; // Mock price
        const costInUsd = costInEther * ethUsdPrice;

        return {
            success: true,
            transaction: {
                gasLimit,
                gasPrice: `${gasPrice} Gwei`,
                network
            },
            cost: {
                gwei: costInGwei.toFixed(2),
                ether: costInEther.toFixed(6),
                usd: costInUsd.toFixed(2)
            },
            comparisons: {
                slow: {
                    multiple: (gasPrice / 30).toFixed(2) + 'x',
                    message: gasPrice > 30 ? 'More expensive than slow' : 'Cheaper than slow'
                },
                fast: {
                    multiple: (gasPrice / 100).toFixed(2) + 'x',
                    message: gasPrice < 100 ? 'Cheaper than fast' : 'More expensive than fast'
                }
            },
            note: 'This is an estimate. Actual costs may vary.'
        };
    } catch (error) {
        throw error;
    }
}

async function getGasHistory({ network = 'ethereum', limit = 24 }) {
    try {
        // Simulate historical gas data
        const mockHistory = Array.from({ length: limit }, (_, i) => ({
            hour: limit - i,
            slow: Math.floor(Math.random() * 40 + 20),
            standard: Math.floor(Math.random() * 60 + 40),
            fast: Math.floor(Math.random() * 100 + 80)
        }));

        const avgSlow = (mockHistory.reduce((sum, h) => sum + h.slow, 0) / limit).toFixed(2);
        const avgStandard = (mockHistory.reduce((sum, h) => sum + h.standard, 0) / limit).toFixed(2);
        const avgFast = (mockHistory.reduce((sum, h) => sum + h.fast, 0) / limit).toFixed(2);

        return {
            success: true,
            network,
            period: `Last ${limit} hours`,
            history: mockHistory,
            averages: {
                slow: avgSlow,
                standard: avgStandard,
                fast: avgFast
            },
            trend: 'Use for analyzing gas price patterns',
            note: 'This is simulated data. Use block explorers for real historical data.'
        };
    } catch (error) {
        throw error;
    }
}
