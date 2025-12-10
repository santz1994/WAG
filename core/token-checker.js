// core/token-checker.js - Web3 Token Balance Checker
// Reads live $WAG token balance from Polygon blockchain
// Pure Web3 approach: Blockchain is the database

const ethers = require('ethers');

// Polygon Network Configuration
const POLYGON_RPC = 'https://polygon-rpc.com';

// WAG Token Contract (deployed on Polygon)
// Using a standard ERC20 contract - update with your actual contract address
const WAG_TOKEN_CONTRACT = '0x' + '0'.repeat(40); // PLACEHOLDER - update with real contract

// WAG Token ABI (minimal ERC20)
const WAG_TOKEN_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Tier Definitions - Based on $WAG Token Holdings
const WEB3_TIERS = {
    VISITOR: {
        id: 'visitor',
        name: 'Visitor',
        minTokens: 0,
        maxTokens: 999,
        features: {
            maxApiKeys: 0,
            maxRequestsPerDay: 0,
            toolsAllowed: [],
            description: 'View-only access. Hold 1,000+ $WAG to unlock Tier 1'
        }
    },
    
    HOLDER: {
        id: 'holder',
        name: 'Holder',
        minTokens: 1000,
        maxTokens: 9999,
        features: {
            maxApiKeys: 1,
            maxRequestsPerDay: 1000,
            toolsAllowed: [
                'check-license',
                'unit-converter',
                'gas-monitor',
                'wallet-generator',
                'qr-code-generator',
                'text-to-speech',
                'greeting-card',
                'json-formatter',
                'regex-tester',
                'base64-encoder',
                'uuid-generator',
                'password-generator',
                'api-documentation'
            ],
            description: 'Basic tools for crypto enthusiasts. Hold 10,000+ $WAG for Tier 2'
        }
    },
    
    WHALE: {
        id: 'whale',
        name: 'Whale',
        minTokens: 10000,
        maxTokens: Infinity,
        features: {
            maxApiKeys: 10,
            maxRequestsPerDay: 10000,
            toolsAllowed: 'ALL', // All 50 tools
            description: 'Premium access to all tools. You are a true WAG holder!'
        }
    }
};

/**
 * TokenChecker Class - Core Web3 verification
 */
class TokenChecker {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
        this.tokenContract = null;
        this.cache = {}; // Simple cache for 5-min balance checks (optional optimization)
        this.initializeContract();
    }

    /**
     * Initialize token contract connection
     */
    initializeContract() {
        try {
            this.tokenContract = new ethers.Contract(
                WAG_TOKEN_CONTRACT,
                WAG_TOKEN_ABI,
                this.provider
            );
            console.log('✅ Token checker initialized on Polygon');
        } catch (error) {
            console.error('❌ Failed to initialize token contract:', error.message);
        }
    }

    /**
     * Get user's tier based on live token balance
     * @param {string} walletAddress - Ethereum wallet address
     * @returns {Promise<Object>} - {tier, balance, decimals, tierName}
     */
    async getUserTier(walletAddress) {
        try {
            // Validate wallet address
            if (!ethers.utils.isAddress(walletAddress)) {
                throw new Error('Invalid wallet address');
            }

            // Normalize address
            walletAddress = ethers.utils.getAddress(walletAddress);

            // Get balance from blockchain (READ-ONLY)
            const balance = await this.tokenContract.balanceOf(walletAddress);
            const decimals = await this.tokenContract.decimals();

            // Convert to human-readable format
            const balanceFormatted = parseFloat(ethers.utils.formatUnits(balance, decimals));

            // Determine tier based on balance
            let tier = WEB3_TIERS.VISITOR;
            if (balanceFormatted >= WEB3_TIERS.HOLDER.minTokens && 
                balanceFormatted < WEB3_TIERS.WHALE.minTokens) {
                tier = WEB3_TIERS.HOLDER;
            } else if (balanceFormatted >= WEB3_TIERS.WHALE.minTokens) {
                tier = WEB3_TIERS.WHALE;
            }

            return {
                wallet: walletAddress,
                tier: tier.id,
                tierName: tier.name,
                balance: balanceFormatted,
                balanceRaw: balance.toString(),
                decimals: decimals,
                tierFeatures: tier.features,
                nextTierUnlock: this.getNextTierUnlock(balanceFormatted),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                error: true,
                message: error.message,
                wallet: walletAddress,
                tier: 'visitor',
                balance: 0,
                tierName: 'Visitor'
            };
        }
    }

    /**
     * Get what's needed to unlock next tier
     * @param {number} currentBalance - Current token balance
     * @returns {Object|null}
     */
    getNextTierUnlock(currentBalance) {
        if (currentBalance < WEB3_TIERS.HOLDER.minTokens) {
            return {
                nextTier: 'Holder',
                needed: WEB3_TIERS.HOLDER.minTokens - currentBalance,
                total: WEB3_TIERS.HOLDER.minTokens
            };
        } else if (currentBalance < WEB3_TIERS.WHALE.minTokens) {
            return {
                nextTier: 'Whale',
                needed: WEB3_TIERS.WHALE.minTokens - currentBalance,
                total: WEB3_TIERS.WHALE.minTokens
            };
        }
        return null;
    }

    /**
     * Check if wallet can access a specific tool
     * @param {string} walletAddress - Ethereum wallet address
     * @param {string} toolName - Tool identifier
     * @returns {Promise<Object>} - {canAccess, reason, tierInfo}
     */
    async canAccessTool(walletAddress, toolName) {
        try {
            const tierInfo = await this.getUserTier(walletAddress);
            
            if (tierInfo.error) {
                return {
                    canAccess: false,
                    reason: tierInfo.message,
                    tierInfo
                };
            }

            const tierDef = this.getTierDefinition(tierInfo.tier);
            const allowedTools = tierDef.features.toolsAllowed;

            // Check if tool is allowed
            let hasAccess = false;
            if (allowedTools === 'ALL') {
                hasAccess = true;
            } else if (Array.isArray(allowedTools)) {
                hasAccess = allowedTools.includes(toolName);
            }

            return {
                canAccess: hasAccess,
                reason: hasAccess 
                    ? `Access granted: ${tierInfo.tierName} tier holder`
                    : `Tool "${toolName}" not available in ${tierInfo.tierName} tier`,
                tier: tierInfo.tier,
                tierName: tierInfo.tierName,
                tierInfo
            };
        } catch (error) {
            return {
                canAccess: false,
                reason: error.message,
                tierInfo: {}
            };
        }
    }

    /**
     * Get tier definition by tier ID
     * @param {string} tierId - Tier ID
     * @returns {Object}
     */
    getTierDefinition(tierId) {
        for (const [key, tierDef] of Object.entries(WEB3_TIERS)) {
            if (tierDef.id === tierId) {
                return tierDef;
            }
        }
        return WEB3_TIERS.VISITOR;
    }

    /**
     * Get all tier definitions
     * @returns {Object}
     */
    getAllTiers() {
        return WEB3_TIERS;
    }

    /**
     * Verify wallet ownership (simple check - can be enhanced with signature verification)
     * @param {string} walletAddress - Wallet address to verify
     * @returns {boolean}
     */
    verifyWalletAddress(walletAddress) {
        try {
            ethers.utils.getAddress(walletAddress);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get live total supply of WAG token
     * @returns {Promise<number>}
     */
    async getTotalSupply() {
        try {
            const supply = await this.tokenContract.totalSupply();
            const decimals = await this.tokenContract.decimals();
            return parseFloat(ethers.utils.formatUnits(supply, decimals));
        } catch (error) {
            console.error('Failed to fetch total supply:', error.message);
            return 0;
        }
    }

    /**
     * Get token price from DEX (optional - for display only)
     * Note: This would require calling a price oracle
     * Placeholder for future implementation
     */
    async getTokenPrice() {
        // TODO: Integrate with price oracle (Chainlink, etc.)
        return 0;
    }
}

// Initialize and export
const tokenChecker = new TokenChecker();

module.exports = {
    tokenChecker,
    TokenChecker,
    WEB3_TIERS,
    WAG_TOKEN_CONTRACT
};
