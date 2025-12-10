// modules/crypto/wallet-watcher.js
// Monitor wallet balances and recent transactions

const axios = require('axios');

module.exports = {
    name: "Wallet Watcher",
    slug: "wallet-watcher",
    type: "api",
    version: "1.0.0",
    description: "Monitor wallet balances and transaction history (Simple explorer)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'get-balance':
                    return getBalance(params);
                case 'get-transactions':
                    return getTransactions(params);
                case 'watch-wallet':
                    return watchWallet(params);
                case 'get-portfolio':
                    return getPortfolio(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

async function getBalance({ walletAddress, network = 'ethereum' }) {
    try {
        if (!walletAddress) {
            return { success: false, error: 'walletAddress is required' };
        }

        if (!isValidAddress(walletAddress)) {
            return { success: false, error: 'Invalid Ethereum address' };
        }

        // Simulate balance check (in production, would use actual RPC/Etherscan API)
        const mockBalance = Math.random() * 50;

        return {
            success: true,
            address: walletAddress,
            network,
            balance: {
                ether: mockBalance.toFixed(6),
                wei: Math.floor(mockBalance * 1e18),
                usd: (mockBalance * 2500).toFixed(2) // Mock ETH price
            },
            lastUpdated: new Date().toISOString(),
            note: 'This is simulated data. Use Etherscan API for real balances.'
        };
    } catch (error) {
        throw error;
    }
}

async function getTransactions({ walletAddress, limit = 10, network = 'ethereum' }) {
    try {
        if (!walletAddress) {
            return { success: false, error: 'walletAddress is required' };
        }

        if (!isValidAddress(walletAddress)) {
            return { success: false, error: 'Invalid Ethereum address' };
        }

        // Simulate transaction history
        const mockTxs = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
            hash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            from: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            to: walletAddress,
            value: (Math.random() * 10).toFixed(4) + ' ETH',
            gasPrice: Math.floor(Math.random() * 100 + 30) + ' Gwei',
            status: Math.random() > 0.05 ? 'success' : 'failed',
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            type: Math.random() > 0.5 ? 'in' : 'out'
        }));

        const incomingTx = mockTxs.filter(tx => tx.type === 'in').length;
        const outgoingTx = mockTxs.filter(tx => tx.type === 'out').length;

        return {
            success: true,
            address: walletAddress,
            network,
            transactionCount: mockTxs.length,
            stats: {
                incoming: incomingTx,
                outgoing: outgoingTx,
                successful: mockTxs.filter(tx => tx.status === 'success').length,
                failed: mockTxs.filter(tx => tx.status === 'failed').length
            },
            transactions: mockTxs,
            note: 'This is simulated data. Use Etherscan for real transaction history.'
        };
    } catch (error) {
        throw error;
    }
}

async function watchWallet({ walletAddress, alertThreshold = null }) {
    try {
        if (!walletAddress) {
            return { success: false, error: 'walletAddress is required' };
        }

        if (!isValidAddress(walletAddress)) {
            return { success: false, error: 'Invalid Ethereum address' };
        }

        const balance = await getBalance({ walletAddress });
        const txs = await getTransactions({ walletAddress, limit: 5 });

        if (!balance.success || !txs.success) {
            return { success: false, error: 'Failed to fetch wallet data' };
        }

        const lastTx = txs.transactions.length > 0 ? txs.transactions[0] : null;
        const lastTxTime = lastTx ? new Date(lastTx.timestamp) : null;
        const timeSinceLastTx = lastTxTime ? Math.floor((Date.now() - lastTxTime) / 1000 / 60) : null;

        return {
            success: true,
            message: 'Wallet monitoring data retrieved',
            wallet: {
                address: walletAddress,
                balance: balance.balance.ether + ' ETH',
                balanceUSD: balance.balance.usd
            },
            activity: {
                lastTransaction: lastTx ? lastTx.hash : 'No transactions',
                timeSinceLastTx: timeSinceLastTx ? `${timeSinceLastTx} minutes ago` : 'N/A',
                totalTransactions: txs.transactionCount,
                incomingTxs: txs.stats.incoming,
                outgoingTxs: txs.stats.outgoing
            },
            alerts: generateAlerts(balance, txs, alertThreshold),
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        throw error;
    }
}

async function getPortfolio({ walletAddress, includeTokens = true }) {
    try {
        if (!walletAddress) {
            return { success: false, error: 'walletAddress is required' };
        }

        if (!isValidAddress(walletAddress)) {
            return { success: false, error: 'Invalid Ethereum address' };
        }

        const ethBalance = await getBalance({ walletAddress });

        // Simulate token holdings
        const mockTokens = includeTokens ? [
            {
                symbol: 'USDC',
                name: 'USD Coin',
                balance: Math.floor(Math.random() * 10000),
                price: 1,
                value: Math.floor(Math.random() * 10000)
            },
            {
                symbol: 'DAI',
                name: 'Dai Stablecoin',
                balance: Math.floor(Math.random() * 5000),
                price: 1,
                value: Math.floor(Math.random() * 5000)
            },
            {
                symbol: 'WAG',
                name: 'WAG Token',
                balance: Math.floor(Math.random() * 1000000),
                price: 0.001,
                value: Math.floor(Math.random() * 1000)
            }
        ] : [];

        const totalValue = 
            parseFloat(ethBalance.balance.usd) + 
            mockTokens.reduce((sum, t) => sum + t.value, 0);

        return {
            success: true,
            address: walletAddress,
            portfolio: {
                native: {
                    symbol: 'ETH',
                    balance: ethBalance.balance.ether,
                    value: ethBalance.balance.usd
                },
                tokens: mockTokens,
                totalValue: totalValue.toFixed(2)
            },
            summary: {
                assetCount: 1 + mockTokens.length,
                largestHolding: ethBalance.balance.ether + ' ETH',
                lastUpdated: new Date().toISOString()
            },
            note: 'This is simulated portfolio data. Use DeFi aggregators for real holdings.'
        };
    } catch (error) {
        throw error;
    }
}

function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function generateAlerts(balance, txs, threshold) {
    const alerts = [];

    const balanceValue = parseFloat(balance.balance.ether);
    if (threshold && balanceValue < threshold) {
        alerts.push({
            level: 'WARNING',
            message: `Balance below threshold: ${balanceValue} ETH < ${threshold} ETH`
        });
    }

    if (txs.stats.failed > 0) {
        alerts.push({
            level: 'INFO',
            message: `${txs.stats.failed} failed transactions in recent history`
        });
    }

    if (balanceValue === 0) {
        alerts.push({
            level: 'INFO',
            message: 'Wallet has zero balance'
        });
    }

    if (alerts.length === 0) {
        alerts.push({
            level: 'OK',
            message: 'No alerts'
        });
    }

    return alerts;
}
