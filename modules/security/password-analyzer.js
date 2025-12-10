// modules/security/password-analyzer.js
// Analyze password strength & estimate brute-force crack time

const zxcvbn = require('zxcvbn');
const crypto = require('crypto');

module.exports = {
    name: "Password Strength Analyzer",
    slug: "password-analyzer",
    type: "api",
    version: "1.0.0",
    description: "Offline password strength audit & brute-force time estimation",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'analyze':
                    return analyzePassword(params);
                case 'compare':
                    return comparePasswords(params);
                case 'generate-recommendation':
                    return generateRecommendation(params);
                case 'estimate-cracktime':
                    return estimateCrackTime(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function analyzePassword({ password, userInputs = [] }) {
    try {
        if (!password) {
            return { success: false, error: 'Password is required' };
        }

        // Use zxcvbn for analysis (Dropbox's password strength algorithm)
        const analysis = zxcvbn(password, userInputs);

        const riskLevel = getRiskLevel(analysis.score);
        const recommendations = getRecommendations(analysis);

        return {
            success: true,
            password_length: password.length,
            score: analysis.score, // 0-4
            scoreLabel: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][analysis.score],
            riskLevel,
            entropy: {
                guesses: analysis.guesses,
                guesses_log10: analysis.guesses_log10,
                bits: Math.log2(analysis.guesses).toFixed(2)
            },
            crackTime: {
                offlineSlowHashing: analysis.crack_times_display.offline_slow_hashing_1e4_per_second,
                offlineFastHashing: analysis.crack_times_display.offline_fast_hashing_1e10_per_second,
                onlineNoThrottling: analysis.crack_times_display.online_no_throttling_10_per_second,
                onlineThrottling: analysis.crack_times_display.online_throttling_100_per_hour
            },
            feedback: {
                warning: analysis.feedback.warning || 'No warning',
                suggestions: analysis.feedback.suggestions || [],
                patterns: analysis.sequence.map(seq => ({
                    type: seq.pattern,
                    token: seq.token,
                    start: seq.i,
                    end: seq.j
                }))
            },
            recommendations,
            timestamp: new Date().toISOString(),
            note: 'This analysis is performed OFFLINE and no password data is transmitted'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function comparePasswords({ passwords = [] }) {
    try {
        if (!Array.isArray(passwords) || passwords.length === 0) {
            return { success: false, error: 'Passwords array is required and non-empty' };
        }

        if (passwords.length > 10) {
            return { success: false, error: 'Maximum 10 passwords to compare' };
        }

        const results = passwords.map((pwd, index) => {
            const analysis = zxcvbn(pwd);
            return {
                index: index + 1,
                password_length: pwd.length,
                score: analysis.score,
                scoreLabel: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][analysis.score],
                riskLevel: getRiskLevel(analysis.score),
                crackTime: analysis.crack_times_display.offline_slow_hashing_1e4_per_second
            };
        });

        // Find best and worst
        const bestPassword = results.reduce((prev, current) => 
            current.score > prev.score ? current : prev
        );

        const worstPassword = results.reduce((prev, current) => 
            current.score < prev.score ? current : prev
        );

        return {
            success: true,
            message: 'Password comparison completed',
            totalPasswords: results.length,
            results,
            bestPassword: {
                index: bestPassword.index,
                score: bestPassword.score,
                scoreLabel: bestPassword.scoreLabel
            },
            worstPassword: {
                index: worstPassword.index,
                score: worstPassword.score,
                scoreLabel: worstPassword.scoreLabel
            },
            recommendation: `Use password #${bestPassword.index} - it has the strongest score (${bestPassword.scoreLabel})`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function generateRecommendation({ passwordLength = 12, includeSymbols = true, includeNumbers = true }) {
    try {
        if (passwordLength < 8 || passwordLength > 128) {
            return { success: false, error: 'Password length must be between 8-128' };
        }

        // Character pools
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        let charPool = lowercase + uppercase;
        if (includeNumbers) charPool += numbers;
        if (includeSymbols) charPool += symbols;

        // Generate random password
        let recommendedPassword = '';
        for (let i = 0; i < passwordLength; i++) {
            recommendedPassword += charPool.charAt(crypto.randomInt(0, charPool.length));
        }

        // Analyze the generated password
        const analysis = zxcvbn(recommendedPassword);

        return {
            success: true,
            recommendedPassword,
            length: passwordLength,
            score: analysis.score,
            scoreLabel: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][analysis.score],
            riskLevel: getRiskLevel(analysis.score),
            crackTime: analysis.crack_times_display.offline_slow_hashing_1e4_per_second,
            characterSet: {
                lowercase: includeNumbers || includeSymbols,
                uppercase: true,
                numbers: includeNumbers,
                symbols: includeSymbols,
                totalCharacterPool: charPool.length
            },
            entropy: {
                bits: Math.log2(analysis.guesses).toFixed(2),
                timeToGuess: analysis.crack_times_display.offline_slow_hashing_1e4_per_second
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function estimateCrackTime({ password, attackMethod = 'offline_slow' }) {
    try {
        if (!password) {
            return { success: false, error: 'Password is required' };
        }

        const validMethods = ['offline_slow', 'offline_fast', 'online_no_throttle', 'online_throttle'];
        if (!validMethods.includes(attackMethod)) {
            return { success: false, error: `Attack method must be one of: ${validMethods.join(', ')}` };
        }

        const analysis = zxcvbn(password);

        let crackTime = '';
        let attemptsPerSecond = 0;

        switch (attackMethod) {
            case 'offline_slow':
                crackTime = analysis.crack_times_display.offline_slow_hashing_1e4_per_second;
                attemptsPerSecond = 10000;
                break;
            case 'offline_fast':
                crackTime = analysis.crack_times_display.offline_fast_hashing_1e10_per_second;
                attemptsPerSecond = 10000000000;
                break;
            case 'online_no_throttle':
                crackTime = analysis.crack_times_display.online_no_throttling_10_per_second;
                attemptsPerSecond = 10;
                break;
            case 'online_throttle':
                crackTime = analysis.crack_times_display.online_throttling_100_per_hour;
                attemptsPerSecond = 0.0278; // ~100 per hour
                break;
        }

        return {
            success: true,
            password_length: password.length,
            attackMethod,
            attemptsPerSecond,
            score: analysis.score,
            crackTime,
            totalGuesses: analysis.guesses.toLocaleString(),
            estimateAccuracy: 'This is an estimate based on statistical analysis',
            warnings: [
                'Actual crack time varies based on attacker resources',
                'Online attacks are throttled by rate-limiting (slower)',
                'Offline attacks have no rate-limiting (faster)',
                'GPU/ASIC attacks can be significantly faster',
                'Quantum computers could break this significantly faster'
            ]
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getRiskLevel(score) {
    const levels = {
        0: { level: '🔴 CRITICAL', description: 'Extremely weak - avoid using this password' },
        1: { level: '🟠 HIGH RISK', description: 'Weak - easily cracked by attackers' },
        2: { level: '🟡 MEDIUM', description: 'Fair - acceptable for non-critical accounts' },
        3: { level: '🟢 GOOD', description: 'Strong - suitable for important accounts' },
        4: { level: '🟢 EXCELLENT', description: 'Very strong - military-grade security' }
    };

    return levels[score] || levels[0];
}

function getRecommendations(analysis) {
    const recs = [];

    // Length recommendations
    if (analysis.password.length < 8) {
        recs.push('❌ Use at least 8 characters (preferably 12+)');
    } else if (analysis.password.length < 12) {
        recs.push('⚠️  Consider using 12+ characters for better security');
    } else {
        recs.push('✅ Good password length (12+ characters)');
    }

    // Complexity recommendations
    const hasLower = /[a-z]/.test(analysis.password);
    const hasUpper = /[A-Z]/.test(analysis.password);
    const hasNumber = /[0-9]/.test(analysis.password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(analysis.password);

    if (!hasLower || !hasUpper) {
        recs.push('❌ Mix uppercase and lowercase letters');
    } else {
        recs.push('✅ Good mix of upper and lower case');
    }

    if (!hasNumber) {
        recs.push('❌ Add numbers (0-9) for better security');
    } else {
        recs.push('✅ Contains numbers');
    }

    if (!hasSymbol) {
        recs.push('❌ Add special symbols (!@#$%...) for strongest passwords');
    } else {
        recs.push('✅ Contains special symbols');
    }

    // Pattern warnings from zxcvbn
    if (analysis.feedback.suggestions && analysis.feedback.suggestions.length > 0) {
        recs.push('⚠️  ' + analysis.feedback.suggestions[0]);
    }

    // Score-based recommendations
    if (analysis.score < 2) {
        recs.push('❌ Never use this password for important accounts (banking, crypto, email)');
    } else if (analysis.score === 2) {
        recs.push('⚠️  Use only for low-value accounts, not for critical services');
    } else if (analysis.score === 3) {
        recs.push('✅ Suitable for most online accounts');
    } else if (analysis.score === 4) {
        recs.push('🔒 Excellent for high-security accounts (crypto wallets, email)');
    }

    return recs;
}
