// core/tier-system.js - REFACTORED: Web3 On-Chain Tier System
// Token Holdings = Ownership Model (Pure Web3)
// No subscription, no database, blockchain is the database

const { tokenChecker, WEB3_TIERS } = require('./token-checker');

/**
 * TierSystem - Web3 Version (On-Chain Token Gating)
 * Checks user tier based on live token balance from Polygon blockchain
 */
class TierSystem {
    constructor() {
        this.tokenChecker = tokenChecker;
        console.log('✅ TierSystem initialized (Web3 Mode - On-Chain Tier Checking)');
    }

    /**
     * Get user tier by checking live token balance
     * @param {string} wallet - Wallet address
     * @returns {Promise<Object>}
     */
    async getUserTier(wallet) {
        return await this.tokenChecker.getUserTier(wallet);
    }

    /**
     * Check if user can access a tool
     * @param {string} wallet - Wallet address
     * @param {string} toolName - Tool name
     * @returns {Promise<boolean>}
     */
    async canAccessTool(wallet, toolName) {
        const result = await this.tokenChecker.canAccessTool(wallet, toolName);
        return result.canAccess;
    }

    /**
     * Get access details for a tool
     * @param {string} wallet - Wallet address
     * @param {string} toolName - Tool name
     * @returns {Promise<Object>}
     */
    async getToolAccessDetails(wallet, toolName) {
        return await this.tokenChecker.canAccessTool(wallet, toolName);
    }

    /**
     * Get all tier definitions
     * @returns {Object}
     */
    getAllTiers() {
        return this.tokenChecker.getAllTiers();
    }

    /**
     * Get formatted tier info for display
     * @param {string} wallet - Wallet address
     * @returns {Promise<Object>}
     */
    async getTierInfo(wallet) {
        const tierData = await this.tokenChecker.getUserTier(wallet);
        
        if (tierData.error) {
            return {
                error: true,
                message: tierData.message,
                wallet
            };
        }

        const tierDef = this.tokenChecker.getTierDefinition(tierData.tier);

        return {
            wallet: tierData.wallet,
            tier: tierData.tier,
            tierName: tierData.tierName,
            balance: tierData.balance,
            features: tierDef.features,
            toolsCount: tierDef.features.toolsAllowed === 'ALL' 
                ? 50 
                : tierDef.features.toolsAllowed.length,
            nextTierUnlock: tierData.nextTierUnlock,
            timestamp: tierData.timestamp
        };
    }

    /**
     * Get comparison of all tiers
     * @returns {Object}
     */
    getTierComparison() {
        const tiers = this.tokenChecker.getAllTiers();
        const comparison = {};

        for (const [key, tierDef] of Object.entries(tiers)) {
            comparison[tierDef.id] = {
                name: tierDef.name,
                minTokens: tierDef.minTokens,
                maxTokens: tierDef.maxTokens === Infinity ? 'Unlimited' : tierDef.maxTokens,
                features: {
                    apiKeys: tierDef.features.maxApiKeys,
                    dailyRequests: tierDef.features.maxRequestsPerDay,
                    tools: tierDef.features.toolsAllowed === 'ALL' 
                        ? 'All 50 tools' 
                        : `${tierDef.features.toolsAllowed.length} tools`,
                    toolsList: tierDef.features.toolsAllowed
                },
                description: tierDef.features.description
            };
        }

        return comparison;
    }

    /**
     * Verify wallet is valid
     * @param {string} wallet - Wallet address
     * @returns {boolean}
     */
    verifyWallet(wallet) {
        return this.tokenChecker.verifyWalletAddress(wallet);
    }

    /**
     * Get total WAG token supply
     * @returns {Promise<number>}
     */
    async getTotalSupply() {
        return await this.tokenChecker.getTotalSupply();
    }

    // ============ DEPRECATED - KEPT FOR BACKWARD COMPATIBILITY ============
    // These methods are no longer used in Web3 mode
    // Kept as stubs to prevent breaking changes

    registerUser() {
        console.log('ℹ️  registerUser() is DEPRECATED in Web3 mode');
        console.log('   Users auto-register by connecting wallet - no database needed');
    }

    upgradeUserToPremium() {
        console.log('ℹ️  upgradeUserToPremium() is DEPRECATED in Web3 mode');
        console.log('   Users upgrade by buying more $WAG tokens on Polygon');
    }

    recordUsage() {
        console.log('ℹ️  recordUsage() is OPTIONAL in Web3 mode');
        console.log('   On-chain actions are already tracked on blockchain');
    }

    getUsageStats() {
        console.log('ℹ️  getUsageStats() would come from blockchain events');
    }
}

// Create singleton instance
const tierSystem = new TierSystem();

module.exports = {
    tierSystem,
    TierSystem,
    WEB3_TIERS
};
