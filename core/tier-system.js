// core/tier-system.js - Free vs Premium Subscription Model
// Manages user tiers and feature access control

const fs = require('fs');
const path = require('path');

const TIERS_FILE = path.join(__dirname, '../.wag-tiers.json');

/**
 * Tier Definitions
 */
const TIER_DEFINITIONS = {
    FREE: {
        id: 'free',
        name: 'Free',
        price: 0,
        features: {
            maxApiKeys: 1,
            maxRequestsPerDay: 100,
            maxRequestsPerMonth: 2000,
            toolsAllowed: [
                // WhatsApp Gateway
                'check-license',
                
                // Phase 1: MVP (Limited)
                'text-to-speech',  // Free version limited to 100 chars
                'greeting-card',
                
                // Phase 2: Office Admin (Very Limited)
                'pdf-merge',       // Up to 5 pages
                
                // Phase 4: Developer (Limited)
                'api-documentation',
                'code-snippet-storage'
            ],
            prioritySupport: false,
            customBranding: false,
            advancedAnalytics: false,
            webhooks: false,
            sso: false,
            customDomain: false,
            description: 'Perfect for individuals trying WAG Tool'
        }
    },
    
    PREMIUM: {
        id: 'premium',
        name: 'Premium',
        price: 99,  // Per month or per year (in USD/USDT)
        features: {
            maxApiKeys: 50,
            maxRequestsPerDay: 100000,
            maxRequestsPerMonth: 3000000,
            toolsAllowed: 'ALL',  // All 50 tools
            prioritySupport: true,
            customBranding: true,
            advancedAnalytics: true,
            webhooks: true,
            sso: true,
            customDomain: true,
            dedicatedManager: false,
            description: 'For professionals and businesses'
        }
    },
    
    ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'custom',  // Custom pricing
        features: {
            maxApiKeys: 'unlimited',
            maxRequestsPerDay: 'unlimited',
            maxRequestsPerMonth: 'unlimited',
            toolsAllowed: 'ALL',
            prioritySupport: true,
            customBranding: true,
            advancedAnalytics: true,
            webhooks: true,
            sso: true,
            customDomain: true,
            dedicatedManager: true,
            apiWhitelisting: true,
            customIntegrations: true,
            description: 'For large organizations with custom needs'
        }
    }
};

class TierSystem {
    constructor() {
        this.tiersFile = TIERS_FILE;
        this.users = {};
        this.usage = {};
        this.loadTiers();
    }

    // ============ INITIALIZATION ============

    loadTiers() {
        try {
            if (fs.existsSync(this.tiersFile)) {
                const data = fs.readFileSync(this.tiersFile, 'utf-8');
                const parsed = JSON.parse(data);
                this.users = parsed.users || {};
                this.usage = parsed.usage || {};
                console.log(`✅ Loaded ${Object.keys(this.users).length} tier records`);
            } else {
                this.users = {};
                this.usage = {};
                this.saveTiers();
            }
        } catch (error) {
            console.error('Error loading tiers:', error.message);
            this.users = {};
            this.usage = {};
        }
    }

    saveTiers() {
        try {
            fs.writeFileSync(this.tiersFile, JSON.stringify({
                users: this.users,
                usage: this.usage,
                timestamp: new Date().toISOString()
            }, null, 2));
        } catch (error) {
            console.error('Error saving tiers:', error.message);
        }
    }

    // ============ USER TIER MANAGEMENT ============

    /**
     * Register user with Free tier (default)
     */
    registerUser(wallet, metadata = {}) {
        if (!wallet.startsWith('0x') || wallet.length !== 42) {
            throw new Error('Invalid wallet address');
        }

        if (this.users[wallet]) {
            throw new Error('User already registered');
        }

        this.users[wallet] = {
            wallet,
            tier: 'free',
            status: 'active',
            created: new Date().toISOString(),
            upgraded: null,
            premiumExpiry: null,
            metadata
        };

        this.usage[wallet] = {
            wallet,
            daily: 0,
            monthly: 0,
            lastReset: new Date().toISOString(),
            monthlyResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
        };

        this.saveTiers();

        return {
            status: true,
            message: 'User registered with FREE tier',
            user: this.users[wallet]
        };
    }

    /**
     * Upgrade user to Premium
     * @param {string} wallet - User wallet
     * @param {string} paymentMethod - 'crypto' or 'card'
     * @param {number} duration - Days (30, 90, 365)
     */
    upgradeUserToPremium(wallet, paymentMethod = 'crypto', duration = 30) {
        if (!this.users[wallet]) {
            throw new Error('User not found');
        }

        const user = this.users[wallet];
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + duration);

        user.tier = 'premium';
        user.upgraded = new Date().toISOString();
        user.premiumExpiry = expiryDate.toISOString();
        user.paymentMethod = paymentMethod;

        this.saveTiers();

        return {
            status: true,
            message: `User upgraded to PREMIUM (${duration} days)`,
            user,
            totalCost: `${TIER_DEFINITIONS.PREMIUM.price * (duration / 30)} ${paymentMethod === 'crypto' ? 'USDT' : 'USD'}`
        };
    }

    /**
     * Downgrade user to Free
     */
    downgradeUserToFree(wallet) {
        if (!this.users[wallet]) {
            throw new Error('User not found');
        }

        const user = this.users[wallet];
        user.tier = 'free';
        user.premiumExpiry = null;

        this.saveTiers();

        return {
            status: true,
            message: 'User downgraded to FREE tier',
            user
        };
    }

    /**
     * Get user tier info
     */
    getUserTier(wallet) {
        if (!this.users[wallet]) {
            return null;
        }

        const user = this.users[wallet];
        const tierDef = TIER_DEFINITIONS[user.tier.toUpperCase()];
        const userUsage = this.usage[wallet] || {};

        // Check if premium expired
        if (user.tier === 'premium' && user.premiumExpiry) {
            if (new Date(user.premiumExpiry) < new Date()) {
                user.tier = 'free';
                this.saveTiers();
            }
        }

        return {
            wallet,
            tier: user.tier,
            tierInfo: tierDef,
            status: user.status,
            created: user.created,
            upgraded: user.upgraded,
            premiumExpiry: user.premiumExpiry,
            usage: {
                daily: userUsage.daily,
                monthly: userUsage.monthly,
                limits: {
                    daily: tierDef.features.maxRequestsPerDay,
                    monthly: tierDef.features.maxRequestsPerMonth
                },
                allowedTools: tierDef.features.toolsAllowed,
                remainingDaily: tierDef.features.maxRequestsPerDay - userUsage.daily,
                remainingMonthly: tierDef.features.maxRequestsPerMonth - userUsage.monthly
            }
        };
    }

    /**
     * List all users (admin)
     */
    listAllUsers(filterTier = null) {
        return Object.values(this.users)
            .filter(user => !filterTier || user.tier === filterTier)
            .map(user => ({
                wallet: user.wallet,
                tier: user.tier,
                status: user.status,
                created: user.created,
                premiumExpiry: user.premiumExpiry
            }));
    }

    // ============ USAGE TRACKING ============

    /**
     * Record tool usage (called after each tool execution)
     */
    recordUsage(wallet, toolName) {
        if (!this.usage[wallet]) {
            this.usage[wallet] = {
                wallet,
                daily: 0,
                monthly: 0,
                lastReset: new Date().toISOString(),
                monthlyResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
                toolUsage: {}
            };
        }

        const userUsage = this.usage[wallet];
        const now = new Date();

        // Reset daily if needed
        if (this.shouldResetDaily(userUsage)) {
            userUsage.daily = 0;
            userUsage.lastReset = now.toISOString();
        }

        // Reset monthly if needed
        if (this.shouldResetMonthly(userUsage)) {
            userUsage.monthly = 0;
            userUsage.monthlyResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        }

        // Increment counters
        userUsage.daily++;
        userUsage.monthly++;

        // Track per-tool usage
        if (!userUsage.toolUsage) userUsage.toolUsage = {};
        userUsage.toolUsage[toolName] = (userUsage.toolUsage[toolName] || 0) + 1;

        this.saveTiers();
    }

    /**
     * Check if user can access tool based on tier
     */
    canAccessTool(wallet, toolName) {
        const user = this.users[wallet];
        if (!user) {
            return { allowed: false, reason: 'User not found' };
        }

        const tierDef = TIER_DEFINITIONS[user.tier.toUpperCase()];

        // Check if tool is allowed in tier
        if (tierDef.features.toolsAllowed !== 'ALL' && 
            !tierDef.features.toolsAllowed.includes(toolName)) {
            return {
                allowed: false,
                reason: `Tool "${toolName}" not available in ${user.tier} tier`,
                suggestedTier: 'premium'
            };
        }

        // Check usage limits
        const usage = this.usage[wallet] || {};
        if (usage.daily >= tierDef.features.maxRequestsPerDay) {
            return {
                allowed: false,
                reason: `Daily limit (${tierDef.features.maxRequestsPerDay}) exceeded`,
                resetTime: this.getNextResetTime(usage.lastReset)
            };
        }

        return { allowed: true };
    }

    /**
     * Get usage statistics
     */
    getUsageStats(wallet) {
        const user = this.users[wallet];
        if (!user) return null;

        const usage = this.usage[wallet] || {};
        const tierDef = TIER_DEFINITIONS[user.tier.toUpperCase()];

        return {
            wallet,
            tier: user.tier,
            daily: {
                used: usage.daily,
                limit: tierDef.features.maxRequestsPerDay,
                percentage: (usage.daily / tierDef.features.maxRequestsPerDay * 100).toFixed(2)
            },
            monthly: {
                used: usage.monthly,
                limit: tierDef.features.maxRequestsPerMonth,
                percentage: (usage.monthly / tierDef.features.maxRequestsPerMonth * 100).toFixed(2)
            },
            topTools: Object.entries(usage.toolUsage || {})
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([tool, count]) => ({ tool, count }))
        };
    }

    // ============ HELPER FUNCTIONS ============

    shouldResetDaily(userUsage) {
        const lastReset = new Date(userUsage.lastReset);
        const now = new Date();
        return lastReset.toDateString() !== now.toDateString();
    }

    shouldResetMonthly(userUsage) {
        const lastReset = new Date(userUsage.monthlyResetDate);
        const now = new Date();
        return lastReset.getMonth() !== now.getMonth();
    }

    getNextResetTime(lastResetIso) {
        const lastReset = new Date(lastResetIso);
        const nextReset = new Date(lastReset);
        nextReset.setDate(nextReset.getDate() + 1);
        return nextReset.toISOString();
    }

    /**
     * Get tier comparison table
     */
    static getTierComparison() {
        return {
            tiers: TIER_DEFINITIONS,
            comparison: {
                'API Keys': {
                    free: TIER_DEFINITIONS.FREE.features.maxApiKeys,
                    premium: TIER_DEFINITIONS.PREMIUM.features.maxApiKeys,
                    enterprise: TIER_DEFINITIONS.ENTERPRISE.features.maxApiKeys
                },
                'Daily Requests': {
                    free: TIER_DEFINITIONS.FREE.features.maxRequestsPerDay,
                    premium: TIER_DEFINITIONS.PREMIUM.features.maxRequestsPerDay,
                    enterprise: TIER_DEFINITIONS.ENTERPRISE.features.maxRequestsPerDay
                },
                'Available Tools': {
                    free: `${TIER_DEFINITIONS.FREE.features.toolsAllowed.length}/50`,
                    premium: '50/50',
                    enterprise: '50/50 + Custom'
                },
                'Priority Support': {
                    free: '❌',
                    premium: '✅',
                    enterprise: '✅ + Dedicated'
                },
                'Custom Branding': {
                    free: '❌',
                    premium: '✅',
                    enterprise: '✅'
                }
            }
        };
    }

    /**
     * Admin: Reset user usage (for testing/disputes)
     */
    adminResetUsage(wallet) {
        if (this.usage[wallet]) {
            this.usage[wallet].daily = 0;
            this.usage[wallet].monthly = 0;
            this.saveTiers();
            return { status: true, message: 'Usage reset' };
        }
        throw new Error('User not found');
    }
}

module.exports = {
    TierSystem,
    TIER_DEFINITIONS
};
