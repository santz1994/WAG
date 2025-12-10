// modules/security/password-generator.js
// Password Generator Tool - Create strong, customizable passwords

module.exports = {
    name: "Password Generator",
    slug: "password-gen",
    type: "api",
    version: "1.0.0",
    description: "Generate secure passwords with customizable complexity levels",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'generate-single':
                    return generateSingle(params);
                case 'generate-batch':
                    return generateBatch(params);
                case 'generate-memorable':
                    return generateMemorable(params);
                case 'check-strength':
                    return checkStrength(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

const CHARSET = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    ambiguous: 'il1Lo0O' // Characters often confused
};

// Generate single password
function generateSingle(params) {
    const {
        length = 16,
        useUppercase = true,
        useLowercase = true,
        useNumbers = true,
        useSymbols = true,
        excludeAmbiguous = false,
        requireEach = true
    } = params;

    if (length < 4 || length > 128) {
        throw new Error('Password length must be between 4 and 128');
    }

    let charset = '';
    const requirements = [];

    if (useLowercase) {
        charset += CHARSET.lowercase;
        requirements.push('lowercase');
    }
    if (useUppercase) {
        charset += CHARSET.uppercase;
        requirements.push('uppercase');
    }
    if (useNumbers) {
        charset += CHARSET.numbers;
        requirements.push('numbers');
    }
    if (useSymbols) {
        charset += CHARSET.symbols;
        requirements.push('symbols');
    }

    if (!charset) {
        throw new Error('At least one character type must be selected');
    }

    if (excludeAmbiguous) {
        charset = charset.split('').filter(c => !CHARSET.ambiguous.includes(c)).join('');
    }

    let password = '';
    let attempts = 0;
    const maxAttempts = 100;

    do {
        password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        attempts++;
    } while (requireEach && !meetsRequirements(password, requirements) && attempts < maxAttempts);

    const strength = calculateStrength(password);

    return {
        status: true,
        action: 'generate-single',
        password,
        length,
        strength: strength.score,
        strengthLabel: strength.label,
        composition: {
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumbers: /[0-9]/.test(password),
            hasSymbols: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
        },
        entropy: calculateEntropy(password, charset.length),
        timestamp: new Date().toISOString()
    };
}

// Generate batch passwords
function generateBatch(params) {
    const {
        count = 10,
        length = 16,
        useUppercase = true,
        useLowercase = true,
        useNumbers = true,
        useSymbols = true
    } = params;

    if (count < 1 || count > 1000) {
        throw new Error('Count must be between 1 and 1000');
    }

    const passwords = [];
    for (let i = 0; i < count; i++) {
        const result = generateSingle({
            length,
            useUppercase,
            useLowercase,
            useNumbers,
            useSymbols
        });
        passwords.push(result.password);
    }

    return {
        status: true,
        action: 'generate-batch',
        count,
        passwords,
        format: 'csv',
        csvData: passwords.join('\n'),
        length,
        timestamp: new Date().toISOString()
    };
}

// Generate memorable passwords (pronounceable)
function generateMemorable(params) {
    const { count = 5, wordCount = 3 } = params;

    const adjectives = [
        'happy', 'sunny', 'bright', 'quick', 'swift', 'calm', 'bold', 'grand',
        'smart', 'keen', 'vivid', 'proud', 'lively', 'eager', 'noble', 'wise'
    ];

    const nouns = [
        'dragon', 'tiger', 'eagle', 'phoenix', 'wolf', 'panda', 'lion', 'bear',
        'whale', 'shark', 'falcon', 'raven', 'horse', 'zebra', 'koala', 'otter'
    ];

    const verbs = [
        'running', 'flying', 'jumping', 'dancing', 'singing', 'swimming',
        'climbing', 'rolling', 'sliding', 'falling', 'soaring', 'spinning'
    ];

    const passwords = [];

    for (let i = 0; i < count; i++) {
        let password = '';
        const words = [];

        for (let w = 0; w < wordCount; w++) {
            const category = [adjectives, nouns, verbs][w % 3];
            words.push(category[Math.floor(Math.random() * category.length)]);
        }

        password = words
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join('') + Math.floor(Math.random() * 1000);

        passwords.push(password);
    }

    return {
        status: true,
        action: 'generate-memorable',
        count,
        passwords,
        wordCount,
        note: 'Easier to remember but lower entropy than random passwords',
        timestamp: new Date().toISOString()
    };
}

// Check password strength
function checkStrength(params) {
    const { password } = params;

    if (!password || typeof password !== 'string') {
        throw new Error('Password is required');
    }

    const strength = calculateStrength(password);
    const feedback = [];

    if (password.length < 8) {
        feedback.push('❌ Password is too short (minimum 8 characters)');
    } else if (password.length < 12) {
        feedback.push('⚠️ Password could be longer (12+ characters recommended)');
    } else {
        feedback.push('✓ Good length');
    }

    if (!/[a-z]/.test(password)) {
        feedback.push('❌ Missing lowercase letters');
    } else {
        feedback.push('✓ Contains lowercase letters');
    }

    if (!/[A-Z]/.test(password)) {
        feedback.push('❌ Missing uppercase letters');
    } else {
        feedback.push('✓ Contains uppercase letters');
    }

    if (!/[0-9]/.test(password)) {
        feedback.push('⚠️ Missing numbers');
    } else {
        feedback.push('✓ Contains numbers');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
        feedback.push('⚠️ Missing special characters');
    } else {
        feedback.push('✓ Contains special characters');
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
        feedback.push('⚠️ Contains repeated characters');
    }

    if (/^[a-zA-Z]+$|^[0-9]+$/.test(password)) {
        feedback.push('❌ Contains only one character type');
    }

    return {
        status: true,
        action: 'check-strength',
        password: password.substring(0, 3) + '*'.repeat(password.length - 3),
        length: password.length,
        strength: strength.score,
        strengthLabel: strength.label,
        entropy: calculateEntropy(password, 94), // 94 printable ASCII characters
        composition: {
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumbers: /[0-9]/.test(password),
            hasSymbols: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
            hasRepeatedChars: /(.)\1{2,}/.test(password)
        },
        feedback,
        recommendation: strength.label === 'Strong' ? 'Safe to use' : 'Consider using a stronger password',
        timestamp: new Date().toISOString()
    };
}

// Helper: Check if password meets all requirements
function meetsRequirements(password, requirements) {
    return requirements.every(req => {
        switch (req) {
            case 'uppercase':
                return /[A-Z]/.test(password);
            case 'lowercase':
                return /[a-z]/.test(password);
            case 'numbers':
                return /[0-9]/.test(password);
            case 'symbols':
                return /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
            default:
                return true;
        }
    });
}

// Helper: Calculate password strength
function calculateStrength(password) {
    let score = 0;

    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 20;

    // Deduct for common patterns
    if (/(.)\1{2,}/.test(password)) score -= 10;
    if (/^[a-zA-Z]+$|^[0-9]+$/.test(password)) score -= 20;

    score = Math.max(0, Math.min(100, score));

    let label;
    if (score < 30) label = 'Weak';
    else if (score < 60) label = 'Fair';
    else if (score < 80) label = 'Good';
    else label = 'Strong';

    return { score, label };
}

// Helper: Calculate entropy
function calculateEntropy(password, charsetSize) {
    if (charsetSize <= 0) return 0;
    return (Math.log2(charsetSize) * password.length).toFixed(2);
}
