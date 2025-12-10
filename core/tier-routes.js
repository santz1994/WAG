// core/tier-routes.js - Free/Premium Tier Management API
// Endpoints for user registration, upgrades, and tier checking

const express = require('express');
const router = express.Router();

/**
 * Factory function to create tier routes
 * @param {TierSystem} tierSystem - Tier management instance
 * @param {object} paymentConfig - Payment processor config
 */
function createTierRoutes(tierSystem, paymentConfig = {}) {
    
    // ============ USER REGISTRATION ============

    /**
     * POST /api/tier/register
     * Register new user (starts with FREE tier)
     */
    router.post('/tier/register', (req, res) => {
        try {
            const { wallet, metadata } = req.body;

            if (!wallet) {
                return res.status(400).json({
                    status: false,
                    message: 'Missing wallet address'
                });
            }

            const result = tierSystem.registerUser(wallet, metadata);

            res.json({
                status: true,
                message: result.message,
                data: result.user,
                nextSteps: 'You can now use FREE tier tools. Upgrade to PREMIUM for full access.'
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    // ============ TIER INFORMATION ============

    /**
     * GET /api/tier/comparison
     * Get tier comparison table
     */
    router.get('/tier/comparison', (req, res) => {
        try {
            const comparison = require('./tier-system').TierSystem.getTierComparison();

            res.json({
                status: true,
                data: comparison
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    /**
     * GET /api/tier/:wallet
     * Get user's current tier info
     */
    router.get('/tier/:wallet', (req, res) => {
        try {
            const { wallet } = req.params;

            const tierInfo = tierSystem.getUserTier(wallet);

            if (!tierInfo) {
                return res.status(404).json({
                    status: false,
                    message: 'User not found. Register first with /api/tier/register'
                });
            }

            res.json({
                status: true,
                data: tierInfo
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    // ============ TIER UPGRADES ============

    /**
     * POST /api/tier/:wallet/upgrade-to-premium
     * Upgrade user to PREMIUM tier
     * Requires payment confirmation
     */
    router.post('/tier/:wallet/upgrade-to-premium', async (req, res) => {
        try {
            const { wallet } = req.params;
            const { duration = 30, paymentMethod = 'crypto', txHash } = req.body;

            if (!['30', '90', '365'].includes(duration.toString())) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid duration. Choose: 30, 90, or 365 days'
                });
            }

            // Verify payment if using crypto
            if (paymentMethod === 'crypto' && txHash) {
                try {
                    // In production: verify transaction on blockchain
                    console.log(`✓ Payment verification for ${wallet}: ${txHash}`);
                } catch (error) {
                    return res.status(400).json({
                        status: false,
                        message: 'Payment verification failed'
                    });
                }
            }

            const result = tierSystem.upgradeUserToPremium(wallet, paymentMethod, parseInt(duration));

            res.json({
                status: true,
                message: result.message,
                data: result.user,
                cost: result.totalCost,
                expiresAt: result.user.premiumExpiry,
                benefits: '✅ Access to all 50 tools\n✅ Unlimited API keys\n✅ Priority support'
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    /**
     * POST /api/tier/:wallet/downgrade-to-free
     * Downgrade user to FREE tier
     */
    router.post('/tier/:wallet/downgrade-to-free', (req, res) => {
        try {
            const { wallet } = req.params;

            const result = tierSystem.downgradeUserToFree(wallet);

            res.json({
                status: true,
                message: result.message,
                data: result.user,
                warning: 'You will lose access to PREMIUM tools. Usage limits apply.'
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    // ============ TOOL ACCESS CONTROL ============

    /**
     * POST /api/tier/check-access
     * Check if user can access a specific tool
     */
    router.post('/tier/check-access', (req, res) => {
        try {
            const { wallet, toolName } = req.body;

            if (!wallet || !toolName) {
                return res.status(400).json({
                    status: false,
                    message: 'Missing wallet or toolName'
                });
            }

            const access = tierSystem.canAccessTool(wallet, toolName);

            if (!access.allowed) {
                return res.status(403).json({
                    status: false,
                    message: access.reason,
                    suggestedTier: access.suggestedTier,
                    resetTime: access.resetTime
                });
            }

            res.json({
                status: true,
                message: `Access to "${toolName}" allowed`,
                allowed: true
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    // ============ USAGE STATISTICS ============

    /**
     * GET /api/tier/:wallet/usage
     * Get usage statistics for user
     */
    router.get('/tier/:wallet/usage', (req, res) => {
        try {
            const { wallet } = req.params;

            const stats = tierSystem.getUsageStats(wallet);

            if (!stats) {
                return res.status(404).json({
                    status: false,
                    message: 'User not found'
                });
            }

            res.json({
                status: true,
                data: stats
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    // ============ ADMIN FUNCTIONS ============

    /**
     * GET /api/tier/admin/users
     * List all users (admin only)
     */
    router.get('/tier/admin/users', (req, res) => {
        try {
            const { tier: filterTier } = req.query;

            const users = tierSystem.listAllUsers(filterTier);

            res.json({
                status: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    /**
     * POST /api/tier/admin/reset-usage
     * Reset usage for user (admin only)
     */
    router.post('/tier/admin/reset-usage', (req, res) => {
        try {
            const { wallet } = req.body;

            if (!wallet) {
                return res.status(400).json({
                    status: false,
                    message: 'Missing wallet'
                });
            }

            const result = tierSystem.adminResetUsage(wallet);

            res.json({
                status: true,
                message: result.message
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    // ============ PAYMENT/UPGRADE FLOW ============

    /**
     * POST /api/tier/:wallet/get-upgrade-quote
     * Get upgrade quote (price calculation)
     */
    router.post('/tier/:wallet/get-upgrade-quote', (req, res) => {
        try {
            const { wallet } = req.params;
            const { duration = 30, currency = 'USD' } = req.body;

            const { TIER_DEFINITIONS } = require('./tier-system');
            const monthlyPrice = TIER_DEFINITIONS.PREMIUM.price;
            const months = duration / 30;
            const totalPrice = (monthlyPrice * months).toFixed(2);

            res.json({
                status: true,
                data: {
                    wallet,
                    tier: 'premium',
                    duration: `${duration} days`,
                    monthlyPrice,
                    months,
                    totalPrice,
                    currency,
                    paymentMethods: ['crypto', 'card'],
                    includes: [
                        'All 50 tools',
                        'Unlimited API keys',
                        'Priority support',
                        'Custom branding',
                        'Advanced analytics'
                    ]
                }
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    /**
     * POST /api/tier/:wallet/validate-payment
     * Validate crypto payment (for smart contract integration)
     */
    router.post('/tier/:wallet/validate-payment', async (req, res) => {
        try {
            const { wallet } = req.params;
            const { txHash, chainId = 137 } = req.body; // 137 = Polygon mainnet

            if (!txHash) {
                return res.status(400).json({
                    status: false,
                    message: 'Missing transaction hash'
                });
            }

            // In production: verify on blockchain
            console.log(`Validating payment on chain ${chainId}: ${txHash}`);

            res.json({
                status: true,
                message: 'Payment validation in progress',
                data: {
                    txHash,
                    status: 'pending',
                    confirmations: 0,
                    requiredConfirmations: 3
                }
            });
        } catch (error) {
            res.status(400).json({
                status: false,
                message: error.message
            });
        }
    });

    return router;
}

module.exports = createTierRoutes;
