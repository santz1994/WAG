// modules/crypto/allowance-checker.js
// Check token approvals and dangerous allowances

module.exports = {
    name: "Token Allowance Checker",
    slug: "allowance-checker",
    type: "api",
    version: "1.0.0",
    description: "Check token approvals and identify dangerous allowances",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'check-allowance':
                    return checkAllowance(params);
                case 'analyze-risks':
                    return analyzeRisks(params);
                case 'revoke-allowance':
                    return revokeAllowance(params);
                case 'batch-check':
                    return batchCheck(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function checkAllowance({ ownerAddress, tokenAddress, spenderAddress }) {
    try {
        if (!ownerAddress || !tokenAddress || !spenderAddress) {
            return { success: false, error: 'ownerAddress, tokenAddress, and spenderAddress required' };
        }

        // Validate addresses
        if (!isValidAddress(ownerAddress) || !isValidAddress(tokenAddress) || !isValidAddress(spenderAddress)) {
            return { success: false, error: 'Invalid Ethereum address format' };
        }

        // Simulate allowance check (in production, would query blockchain)
        const allowance = Math.floor(Math.random() * 1000);
        const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

        const isUnlimited = allowance.toString() === maxUint256 || allowance > 1e18;
        const riskLevel = isUnlimited ? 'CRITICAL' : allowance > 1e15 ? 'HIGH' : allowance > 1e10 ? 'MEDIUM' : 'LOW';

        return {
            success: true,
            owner: ownerAddress,
            token: tokenAddress,
            spender: spenderAddress,
            allowance: {
                amount: allowance,
                isUnlimited,
                percentage: isUnlimited ? '∞' : '100%'
            },
            riskLevel,
            recommendation: isUnlimited 
                ? 'URGENT: Revoke this allowance immediately!'
                : allowance > 1e15
                ? 'Consider reducing allowance'
                : 'Allowance seems reasonable',
            warning: isUnlimited ? 'Spender can withdraw unlimited tokens!' : null
        };
    } catch (error) {
        throw error;
    }
}

function analyzeRisks({ allowances }) {
    try {
        if (!Array.isArray(allowances)) {
            return { success: false, error: 'allowances must be an array of approval objects' };
        }

        const analysis = {
            total: allowances.length,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            risky: []
        };

        for (const allowance of allowances) {
            const isUnlimited = allowance.isUnlimited || allowance.amount > 1e18;
            const riskLevel = isUnlimited ? 'CRITICAL' : allowance.amount > 1e15 ? 'HIGH' : allowance.amount > 1e10 ? 'MEDIUM' : 'LOW';

            analysis[riskLevel.toLowerCase()]++;

            if (riskLevel !== 'LOW') {
                analysis.risky.push({
                    token: allowance.token,
                    spender: allowance.spender,
                    riskLevel,
                    allowance: allowance.amount
                });
            }
        }

        const riskScore = (analysis.critical * 100 + analysis.high * 50 + analysis.medium * 20) / analysis.total;

        return {
            success: true,
            totalAllowances: analysis.total,
            riskBreakdown: {
                critical: analysis.critical,
                high: analysis.high,
                medium: analysis.medium,
                low: analysis.low
            },
            overallRiskScore: riskScore.toFixed(2),
            riskAssessment: riskScore > 50 ? 'HIGH RISK' : riskScore > 20 ? 'MEDIUM RISK' : 'LOW RISK',
            riskyAllowances: analysis.risky,
            recommendations: generateRecommendations(analysis)
        };
    } catch (error) {
        throw error;
    }
}

function revokeAllowance({ ownerAddress, tokenAddress, spenderAddress, estimatedGas = 50000 }) {
    try {
        if (!ownerAddress || !tokenAddress || !spenderAddress) {
            return { success: false, error: 'ownerAddress, tokenAddress, and spenderAddress required' };
        }

        // Simulate revocation transaction
        const txData = {
            to: tokenAddress,
            from: ownerAddress,
            method: 'approve',
            params: [spenderAddress, 0],
            estimatedGas,
            estimatedCost: (estimatedGas * 50 / 1e9).toFixed(6) + ' ETH' // at 50 gwei
        };

        return {
            success: true,
            message: 'Revocation transaction prepared',
            transaction: txData,
            steps: [
                '1. Connect your wallet',
                '2. Review the transaction details',
                '3. Approve the transaction',
                '4. Wait for confirmation',
                '5. Verify allowance is now 0'
            ],
            warning: 'You must broadcast this transaction from the owner address'
        };
    } catch (error) {
        throw error;
    }
}

function batchCheck({ walletAddress, approvals }) {
    try {
        if (!walletAddress || !Array.isArray(approvals)) {
            return { success: false, error: 'walletAddress and approvals (array) required' };
        }

        const results = [];
        let criticalCount = 0;
        let totalAllowance = 0;

        for (const approval of approvals) {
            const result = checkAllowance({
                ownerAddress: walletAddress,
                tokenAddress: approval.token,
                spenderAddress: approval.spender
            });

            if (result.success) {
                results.push(result);
                if (result.riskLevel === 'CRITICAL') criticalCount++;
                totalAllowance += result.allowance.amount;
            }
        }

        return {
            success: true,
            wallet: walletAddress,
            totalApprovals: approvals.length,
            criticalApprovals: criticalCount,
            totalAllowanceValue: totalAllowance,
            results,
            urgentAction: criticalCount > 0 ? `URGENT: ${criticalCount} critical allowance(s) to revoke` : 'No critical allowances'
        };
    } catch (error) {
        throw error;
    }
}

function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.critical > 0) {
        recommendations.push(`⚠️ CRITICAL: Revoke ${analysis.critical} unlimited allowance(s) immediately!`);
    }
    if (analysis.high > 0) {
        recommendations.push(`⚠️ HIGH RISK: Review and reduce ${analysis.high} high-risk allowance(s)`);
    }
    if (analysis.medium > 0) {
        recommendations.push(`📋 MEDIUM RISK: Monitor ${analysis.medium} medium-risk allowance(s)`);
    }

    recommendations.push('✅ Best Practice: Only approve what you need, when you need it');
    recommendations.push('✅ Security: Use allowance checkers regularly');
    recommendations.push('✅ Defense: Consider using proxy contracts that limit exposure');

    return recommendations;
}
