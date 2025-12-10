// modules/crypto/defi-calc.js
// DeFi calculators (Impermanent Loss, Swap Impact, Pool Info)

module.exports = {
    name: "DeFi Calculator",
    slug: "defi-calc",
    type: "api",
    version: "1.0.0",
    description: "Calculate impermanent loss, swap impact, and LP metrics",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'impermanent-loss':
                    return calculateImpermanentLoss(params);
                case 'swap-impact':
                    return calculateSwapImpact(params);
                case 'pool-metrics':
                    return calculatePoolMetrics(params);
                case 'apy-calculator':
                    return calculateAPY(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function calculateImpermanentLoss({ priceChangePct }) {
    try {
        if (priceChangePct === undefined) {
            return { success: false, error: 'priceChangePct is required' };
        }

        const priceMultiplier = 1 + (priceChangePct / 100);
        
        // IL Formula: 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
        const sqrtRatio = Math.sqrt(priceMultiplier);
        const il = (2 * sqrtRatio) / (1 + priceMultiplier) - 1;
        const ilPercentage = il * 100;

        // Calculate gains/losses at different scenarios
        const hodlValue = 100 * priceMultiplier; // If you just held the token
        const lpValue = 100 + (100 * il); // If you provided liquidity
        const difference = hodlValue - lpValue;

        return {
            success: true,
            priceChangePercent: priceChangePct,
            priceMultiplier: priceMultiplier.toFixed(2),
            impermanentLossPercent: ilPercentage.toFixed(4),
            scenario: {
                initialCapital: 100,
                hodlValue: hodlValue.toFixed(2),
                lpValue: lpValue.toFixed(2),
                difference: difference.toFixed(2)
            },
            interpretation: ilPercentage < 0 
                ? `You gain ${Math.abs(ilPercentage).toFixed(2)}% from impermanent gains` 
                : `You lose ${ilPercentage.toFixed(2)}% compared to just holding`,
            note: 'Negative IL means you gain, positive means you lose vs HODL'
        };
    } catch (error) {
        throw error;
    }
}

function calculateSwapImpact({ inputAmount, reserveInput, reserveOutput }) {
    try {
        if (!inputAmount || !reserveInput || !reserveOutput) {
            return { success: false, error: 'inputAmount, reserveInput, and reserveOutput are required' };
        }

        // Using Uniswap V2 constant product formula: x * y = k
        const k = reserveInput * reserveOutput;
        const newReserveInput = reserveInput + inputAmount;
        const newReserveOutput = k / newReserveInput;
        const outputAmount = reserveOutput - newReserveOutput;

        // Spot price before and after
        const spotPriceBefore = reserveOutput / reserveInput;
        const spotPriceAfter = newReserveOutput / newReserveInput;
        const priceImpactPercent = ((spotPriceAfter - spotPriceBefore) / spotPriceBefore) * 100;

        // Execution price vs spot price
        const executionPrice = outputAmount / inputAmount;
        const priceSlippage = ((spotPriceBefore - executionPrice) / spotPriceBefore) * 100;

        return {
            success: true,
            input: {
                amount: inputAmount,
                reserve: reserveInput
            },
            output: {
                amount: outputAmount.toFixed(4),
                reserve: reserveOutput.toFixed(2)
            },
            prices: {
                spotBefore: spotPriceBefore.toFixed(6),
                spotAfter: spotPriceAfter.toFixed(6),
                execution: executionPrice.toFixed(6)
            },
            impact: {
                priceImpactPercent: priceImpactPercent.toFixed(4),
                slippagePercent: priceSlippage.toFixed(4)
            },
            k: k,
            warning: priceImpactPercent > 5 ? 'High price impact - consider breaking up this trade' : 'Price impact acceptable'
        };
    } catch (error) {
        throw error;
    }
}

function calculatePoolMetrics({ totalLiquidity, yourLiquidity, dailyVolume, swapFeePercent = 0.25 }) {
    try {
        if (!totalLiquidity || !yourLiquidity || !dailyVolume) {
            return { success: false, error: 'totalLiquidity, yourLiquidity, and dailyVolume required' };
        }

        const sharePercent = (yourLiquidity / totalLiquidity) * 100;
        const dailyFeesEarned = (dailyVolume * swapFeePercent / 100) * (yourLiquidity / totalLiquidity);
        const estimatedYearlyFees = dailyFeesEarned * 365;
        const apy = (estimatedYearlyFees / yourLiquidity) * 100;

        return {
            success: true,
            poolMetrics: {
                totalLiquidity: totalLiquidity.toFixed(2),
                yourLiquidity: yourLiquidity.toFixed(2),
                yourSharePercent: sharePercent.toFixed(4)
            },
            feeMetrics: {
                dailyVolume: dailyVolume.toFixed(2),
                swapFeePercent,
                dailyFeesEarned: dailyFeesEarned.toFixed(4),
                estimatedYearlyFees: estimatedYearlyFees.toFixed(2)
            },
            returns: {
                estimatedAPY: apy.toFixed(2) + '%',
                monthlyEarnings: (dailyFeesEarned * 30).toFixed(4),
                yearlyEarnings: estimatedYearlyFees.toFixed(2)
            },
            note: 'This does not account for impermanent loss'
        };
    } catch (error) {
        throw error;
    }
}

function calculateAPY({ principalAmount, dailyReturns, compoundingFrequency = 'daily' }) {
    try {
        if (!principalAmount || !dailyReturns) {
            return { success: false, error: 'principalAmount and dailyReturns required' };
        }

        const dailyRate = dailyReturns / principalAmount;
        
        let apy;
        if (compoundingFrequency === 'daily') {
            apy = (Math.pow(1 + dailyRate, 365) - 1) * 100;
        } else if (compoundingFrequency === 'continuous') {
            apy = (Math.exp(dailyRate * 365) - 1) * 100;
        } else {
            apy = dailyRate * 365 * 100;
        }

        const monthlyAmount = principalAmount * Math.pow(1 + dailyRate, 30) - principalAmount;
        const yearlyAmount = principalAmount * Math.pow(1 + dailyRate, 365) - principalAmount;

        return {
            success: true,
            input: {
                principal: principalAmount,
                dailyReturns: dailyReturns,
                compoundingFrequency
            },
            rates: {
                dailyRate: (dailyRate * 100).toFixed(4) + '%',
                estimatedAPY: apy.toFixed(2) + '%'
            },
            projections: {
                monthlyEarnings: monthlyAmount.toFixed(2),
                yearlyEarnings: yearlyAmount.toFixed(2),
                valuAfterYear: (principalAmount + yearlyAmount).toFixed(2)
            }
        };
    } catch (error) {
        throw error;
    }
}
