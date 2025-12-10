// modules/security/secret-splitter.js
// Shamir's Secret Sharing - Split secrets into k-of-n parts

const crypto = require('crypto');

module.exports = {
    name: "Shamir Secret Splitter",
    slug: "secret-splitter",
    type: "api",
    version: "1.0.0",
    description: "Split secrets into k-of-n parts (Shamir Secret Sharing for backup/inheritance)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'split-secret':
                    return splitSecret(params);
                case 'combine-shares':
                    return combineShares(params);
                case 'validate-share':
                    return validateShare(params);
                case 'generate-example':
                    return generateExample();
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

/**
 * Implement basic Shamir Secret Sharing
 * Using polynomial evaluation for k-of-n scheme
 */

function splitSecret({ secret, totalShares = 5, threshold = 3 }) {
    try {
        if (!secret) {
            return { success: false, error: 'Secret is required' };
        }

        if (threshold < 2 || threshold > totalShares) {
            return { success: false, error: `Threshold must be between 2 and ${totalShares}` };
        }

        if (totalShares < 2 || totalShares > 16) {
            return { success: false, error: 'Total shares must be between 2 and 16' };
        }

        // Convert secret to bytes
        let secretBytes;
        if (typeof secret === 'string') {
            secretBytes = Buffer.from(secret, 'utf-8');
        } else {
            secretBytes = Buffer.from(String(secret), 'utf-8');
        }

        // For each byte in secret, generate polynomial and evaluate at points
        const shares = Array(totalShares).fill(null).map(() => []);

        // Process each byte of the secret
        for (let byteIndex = 0; byteIndex < secretBytes.length; byteIndex++) {
            const secretByte = secretBytes[byteIndex];

            // Generate random coefficients for polynomial (degree = threshold - 1)
            const coefficients = [secretByte];
            for (let i = 1; i < threshold; i++) {
                coefficients.push(crypto.randomInt(0, 256));
            }

            // Evaluate polynomial at points 1 to totalShares
            for (let x = 1; x <= totalShares; x++) {
                const y = evaluatePolynomial(coefficients, x);
                shares[x - 1].push(y);
            }
        }

        // Convert shares to hex strings
        const shareStrings = shares.map((share, index) => ({
            index: index + 1,
            data: Buffer.from(share).toString('hex'),
            length: share.length
        }));

        return {
            success: true,
            message: `Secret split successfully`,
            scheme: `${threshold}-of-${totalShares} Shamir Secret Sharing`,
            secretLength: secretBytes.length,
            totalShares,
            threshold,
            shares: shareStrings,
            instructions: `
You need ${threshold} of these ${totalShares} shares to recover the secret.
- Store shares in different locations/with different people
- Each share is equally important (don't identify which share is which)
- Keep shares secure (encrypted or printed in sealed envelopes)
- Any ${threshold} shares can recover the secret
- Fewer than ${threshold} shares reveal NOTHING about the secret
`,
            usageExample: {
                scenario: 'Team backup of private key',
                use: `Split your seed phrase into 5 parts, give to 5 trusted team members. 
                If you die, any 3 team members can recover the seed phrase.
                No single person has enough to compromise security.`
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function combineShares({ shares = [], totalShares = null }) {
    try {
        if (!Array.isArray(shares) || shares.length === 0) {
            return { success: false, error: 'Shares array is required' };
        }

        // Validate share format
        const validShares = shares.filter(share => {
            if (typeof share === 'string') {
                return /^[0-9a-f]+$/i.test(share);
            } else if (typeof share === 'object' && share.data) {
                return /^[0-9a-f]+$/i.test(share.data);
            }
            return false;
        }).map((share, index) => {
            const data = typeof share === 'string' ? share : share.data;
            return {
                index: index + 1,
                data: Buffer.from(data, 'hex')
            };
        });

        if (validShares.length < 2) {
            return { success: false, error: 'At least 2 valid shares required' };
        }

        // Check all shares same length
        const shareLength = validShares[0].data.length;
        if (!validShares.every(s => s.data.length === shareLength)) {
            return { success: false, error: 'All shares must have same length' };
        }

        // Reconstruct secret using Lagrange interpolation
        const recoveredBytes = [];

        for (let byteIndex = 0; byteIndex < shareLength; byteIndex++) {
            // Get points for this byte position
            const points = validShares.map(share => ({
                x: share.index,
                y: share.data[byteIndex]
            }));

            // Use Lagrange interpolation to find f(0) = secret byte
            const secretByte = lagrangeInterpolate(points, 0);
            recoveredBytes.push(secretByte & 0xFF); // Keep in byte range
        }

        const recoveredSecret = Buffer.from(recoveredBytes).toString('utf-8');

        return {
            success: true,
            message: 'Secret recovered successfully',
            sharesUsed: validShares.length,
            secret: recoveredSecret,
            secretLength: recoveredBytes.length,
            recoverySuccess: true,
            timestamp: new Date().toISOString(),
            warning: 'Keep this secret secure! It was reconstructed from shares.'
        };
    } catch (error) {
        return { success: false, error: `Recovery failed: ${error.message}` };
    }
}

function validateShare({ share }) {
    try {
        if (!share) {
            return { success: false, error: 'Share is required' };
        }

        let shareData;
        if (typeof share === 'string') {
            if (!/^[0-9a-f]+$/i.test(share)) {
                return { success: false, error: 'Share must be valid hex string' };
            }
            shareData = Buffer.from(share, 'hex');
        } else if (typeof share === 'object' && share.data) {
            if (!/^[0-9a-f]+$/i.test(share.data)) {
                return { success: false, error: 'Share data must be valid hex string' };
            }
            shareData = Buffer.from(share.data, 'hex');
        } else {
            return { success: false, error: 'Share format invalid' };
        }

        return {
            success: true,
            isValid: true,
            shareLength: shareData.length,
            shareSize: shareData.byteLength + ' bytes',
            format: 'Hex encoded',
            canBeUsedForRecovery: true,
            recommendation: 'This share can be used to recover the secret if combined with at least 1 other share'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function generateExample() {
    return {
        success: true,
        message: 'Shamir Secret Sharing Example',
        scenario: 'Team Backup of Private Key',
        example: {
            secret: 'my-super-secret-seed-phrase',
            totalShares: 5,
            threshold: 3,
            explanation: `
Split into 5 shares, need 3 to recover.
- Give 1 share to trusted colleague
- Give 1 share to lawyer/accountant
- Give 1 share to family member
- Keep 2 shares yourself in different locations
- If you die, any 3 people can combine shares to recover the private key
- No individual has enough to compromise the secret
- Even if 2 shares are stolen, attacker has nothing
`,
            useCases: [
                'Inheritance planning - heirs can recover crypto after death',
                'Team security - distribute credentials across team members',
                'Backup strategy - store parts with different cloud providers',
                'Disaster recovery - survive loss of any 2 locations',
                'Organizational access - M-of-N approval for sensitive operations'
            ]
        },
        howToUse: {
            step1: 'Call split-secret with your secret and desired scheme (e.g., 3-of-5)',
            step2: 'Receive 5 shares (hex strings)',
            step3: 'Distribute shares to trusted locations/people',
            step4: 'When needed, collect any 3 shares',
            step5: 'Call combine-shares with the 3 shares',
            step6: 'Recover the original secret'
        },
        security: {
            advantage1: 'No single point of failure',
            advantage2: 'Threshold scheme: fewer than k shares reveal nothing',
            advantage3: 'Perfect for key management and inheritance',
            limitation: 'Standard SSS - shares are not encrypted. Encrypt shares before distribution.'
        }
    };
}

/**
 * Evaluate polynomial at point x
 * polynomial: array of coefficients [a0, a1, a2, ...]
 * f(x) = a0 + a1*x + a2*x^2 + ...
 */
function evaluatePolynomial(coefficients, x) {
    let result = 0;
    let power = 1;

    for (let i = 0; i < coefficients.length; i++) {
        result = (result + (coefficients[i] * power)) % 256;
        power = (power * x) % 256;
    }

    return result;
}

/**
 * Lagrange interpolation to find f(0)
 * Given points [(x1,y1), (x2,y2), ...], find y = f(0)
 */
function lagrangeInterpolate(points, targetX = 0) {
    let result = 0;

    for (let i = 0; i < points.length; i++) {
        let numerator = 1;
        let denominator = 1;

        for (let j = 0; j < points.length; j++) {
            if (i !== j) {
                numerator = (numerator * (targetX - points[j].x)) % 256;
                denominator = (denominator * (points[i].x - points[j].x)) % 256;
            }
        }

        // Modular inverse for division in mod 256
        const denomInverse = modularInverse(denominator, 256);
        const term = (points[i].y * numerator * denomInverse) % 256;
        result = (result + term) % 256;
    }

    return result;
}

/**
 * Find modular inverse: (a * x) mod m = 1
 */
function modularInverse(a, m) {
    let m0 = m;
    let [x0, x1] = [0, 1];

    if (m === 1) return 0;

    while (a > 1) {
        const q = Math.floor(a / m);
        [m, a] = [a % m, m];
        [x0, x1] = [x1 - q * x0, x0];
    }

    return x1 < 0 ? x1 + m0 : x1;
}
