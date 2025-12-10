// core/tier-middleware.js - Tier-Based Tool Access Control
// Middleware to lock tools based on user tier and check usage limits

/**
 * Factory function to create tier check middleware
 * @param {TierSystem} tierSystem - Tier system instance
 */
function createTierMiddleware(tierSystem) {
    return async (req, res, next) => {
        // Skip tier check untuk routes publik
        const publicRoutes = ['/health', '/info', '/api/tier/comparison', '/api/tier/register'];
        if (publicRoutes.some(route => req.path.includes(route))) {
            return next();
        }

        try {
            // Extract wallet dari request (bisa dari body atau query)
            let wallet = req.body?.wallet || req.query?.wallet;

            if (!wallet) {
                // Jika tidak ada wallet explicit, skip (biarkan auth middleware handle)
                return next();
            }

            // Get user tier
            const tierInfo = tierSystem.getUserTier(wallet);

            if (!tierInfo) {
                return res.status(403).json({
                    status: false,
                    message: 'User not registered. Call /api/tier/register first'
                });
            }

            // Check if tier is active
            if (tierInfo.status !== 'active') {
                return res.status(403).json({
                    status: false,
                    message: `Account status: ${tierInfo.status}`,
                    message_id: 'account_inactive'
                });
            }

            // Check premium expiry
            if (tierInfo.tier === 'premium' && tierInfo.premiumExpiry) {
                if (new Date(tierInfo.premiumExpiry) < new Date()) {
                    return res.status(403).json({
                        status: false,
                        message: 'PREMIUM tier expired. Renew subscription to continue',
                        expiryDate: tierInfo.premiumExpiry
                    });
                }
            }

            // Attach tier info to request
            req.tierInfo = tierInfo;

            next();
        } catch (error) {
            console.error('Tier middleware error:', error.message);
            res.status(500).json({
                status: false,
                message: 'Internal error checking tier'
            });
        }
    };
}

/**
 * Tool access checker - verify tool is allowed for tier
 * @param {TierSystem} tierSystem - Tier system instance
 * @param {string} toolName - Name of tool being accessed
 */
function createToolAccessChecker(tierSystem, toolName) {
    return async (req, res, next) => {
        try {
            if (!req.tierInfo) {
                return res.status(403).json({
                    status: false,
                    message: 'Tier info not found. Register first.'
                });
            }

            const { wallet } = req.tierInfo;

            // Check access
            const access = tierSystem.canAccessTool(wallet, toolName);

            if (!access.allowed) {
                return res.status(403).json({
                    status: false,
                    message: access.reason,
                    suggestedTier: access.suggestedTier || req.tierInfo.tier,
                    upgrade_to: access.suggestedTier || 'premium',
                    tool: toolName
                });
            }

            next();
        } catch (error) {
            console.error('Tool access check error:', error.message);
            res.status(500).json({
                status: false,
                message: 'Error checking tool access'
            });
        }
    };
}

/**
 * Record usage after tool execution
 * @param {TierSystem} tierSystem - Tier system instance
 */
function createUsageRecorder(tierSystem) {
    return (toolName) => {
        return async (req, res, next) => {
            // Record usage after response
            const originalSend = res.send;

            res.send = function(data) {
                try {
                    if (req.tierInfo && res.statusCode === 200) {
                        tierSystem.recordUsage(req.tierInfo.wallet, toolName);
                    }
                } catch (error) {
                    console.error('Usage recording error:', error.message);
                }

                res.send = originalSend;
                return res.send(data);
            };

            next();
        };
    };
}

/**
 * Rate limit checker based on tier quotas
 * @param {TierSystem} tierSystem - Tier system instance
 */
function createRateLimitChecker(tierSystem) {
    return async (req, res, next) => {
        try {
            if (!req.tierInfo) return next();

            const { wallet } = req.tierInfo;
            const tierInfo = tierSystem.getUserTier(wallet);

            // Check daily limit
            if (tierInfo.usage.daily >= tierInfo.usage.limits.daily) {
                return res.status(429).json({
                    status: false,
                    message: 'Daily request limit exceeded',
                    used: tierInfo.usage.daily,
                    limit: tierInfo.usage.limits.daily,
                    resetTime: tierSystem.getNextResetTime(tierInfo.usage),
                    suggestedAction: 'Wait until tomorrow or upgrade to PREMIUM'
                });
            }

            // Check monthly limit
            if (tierInfo.usage.monthly >= tierInfo.usage.limits.monthly) {
                return res.status(429).json({
                    status: false,
                    message: 'Monthly request limit exceeded',
                    used: tierInfo.usage.monthly,
                    limit: tierInfo.usage.limits.monthly,
                    suggestedAction: 'Upgrade to PREMIUM for unlimited requests'
                });
            }

            // Add remaining quota to response headers
            res.setHeader('X-Daily-Remaining', tierInfo.usage.remainingDaily);
            res.setHeader('X-Monthly-Remaining', tierInfo.usage.remainingMonthly);
            res.setHeader('X-Tier', tierInfo.tier);

            next();
        } catch (error) {
            console.error('Rate limit check error:', error.message);
            next(); // Don't block if error
        }
    };
}

module.exports = {
    createTierMiddleware,
    createToolAccessChecker,
    createUsageRecorder,
    createRateLimitChecker
};
