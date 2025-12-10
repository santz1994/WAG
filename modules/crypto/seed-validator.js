// modules/crypto/seed-validator.js
// Validate BIP-39 seed phrases and mnemonics

const bip39 = require('bip39');

module.exports = {
    name: "Seed Phrase Validator",
    slug: "seed-validator",
    type: "api",
    version: "1.0.0",
    description: "Validate BIP-39 seed phrases and generate mnemonics (Offline)",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'validate-seed':
                    return validateSeed(params);
                case 'generate-seed':
                    return generateSeed(params);
                case 'seed-to-key':
                    return seedToKey(params);
                case 'check-wordlist':
                    return checkWordlist(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function validateSeed({ mnemonic, language = 'english' }) {
    try {
        if (!mnemonic) {
            return { success: false, error: 'mnemonic is required' };
        }

        const normalizedSeed = mnemonic.trim().toLowerCase();
        const wordArray = normalizedSeed.split(/\s+/).filter(w => w.length > 0);

        // Check word count (must be 12, 15, 18, 21, or 24)
        const validCounts = [12, 15, 18, 21, 24];
        if (!validCounts.includes(wordArray.length)) {
            return {
                success: false,
                valid: false,
                message: `Invalid word count: ${wordArray.length}. Must be 12, 15, 18, 21, or 24`,
                wordCount: wordArray.length,
                expectedCounts: validCounts
            };
        }

        // Validate with bip39
        const isValid = bip39.validateMnemonic(normalizedSeed, bip39.wordlists[language] || bip39.wordlists.english);

        if (!isValid) {
            return {
                success: false,
                valid: false,
                message: 'Invalid seed phrase. Checksum failed or words not in BIP-39 wordlist',
                wordCount: wordArray.length,
                language
            };
        }

        // Calculate entropy
        const entropyBits = (wordArray.length - 1) / 3 * 32;
        const checksumBits = wordArray.length / 3;

        return {
            success: true,
            valid: true,
            message: 'Valid seed phrase with correct checksum',
            seed: normalizedSeed,
            wordCount: wordArray.length,
            entropy: {
                bits: entropyBits,
                checksumBits: checksumBits,
                totalBits: entropyBits + checksumBits
            },
            security: entropyBits >= 256 ? 'Very Strong (256+ bits)' : entropyBits >= 128 ? 'Strong (128+ bits)' : 'Medium (< 128 bits)',
            language,
            warnings: []
        };
    } catch (error) {
        throw error;
    }
}

function generateSeed({ strength = 128, language = 'english' }) {
    try {
        // Strength: 128 (12 words), 160 (15 words), 192 (18 words), 224 (21 words), 256 (24 words)
        if (![128, 160, 192, 224, 256].includes(strength)) {
            return { success: false, error: 'Strength must be 128, 160, 192, 224, or 256' };
        }

        const mnemonic = bip39.generateMnemonic(strength, undefined, bip39.wordlists[language] || bip39.wordlists.english);
        const wordArray = mnemonic.split(' ');

        return {
            success: true,
            message: 'New BIP-39 seed phrase generated',
            mnemonic,
            wordCount: wordArray.length,
            strength,
            language,
            words: wordArray,
            warning: 'KEEP THIS SEED PHRASE OFFLINE AND SECURE. Never share with anyone!',
            instructions: [
                '1. Write down all words in order',
                '2. Store in a secure location',
                '3. Do NOT take screenshots',
                '4. Do NOT share online',
                '5. Test recovery on different device before depositing funds'
            ]
        };
    } catch (error) {
        throw error;
    }
}

function seedToKey({ mnemonic, passphrase = '' }) {
    try {
        if (!mnemonic) {
            return { success: false, error: 'mnemonic is required' };
        }

        // Validate first
        const validation = validateSeed({ mnemonic });
        if (!validation.valid) {
            return validation;
        }

        // Generate seed from mnemonic
        const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
        const seedHex = seed.toString('hex');

        return {
            success: true,
            message: 'Master seed derived from mnemonic',
            seedHex,
            seedLength: seed.length,
            passphrase: passphrase ? `Used custom passphrase (${passphrase.length} chars)` : 'No passphrase used',
            warning: 'This is your master key. Treat it with extreme care.',
            note: 'Import this into HD wallet software (like MetaMask) to derive account keys'
        };
    } catch (error) {
        throw error;
    }
}

function checkWordlist({ word, language = 'english' }) {
    try {
        if (!word || word.length < 2) {
            return { success: false, error: 'word must be at least 2 characters' };
        }

        const wordlist = bip39.wordlists[language] || bip39.wordlists.english;
        const lowerWord = word.toLowerCase();
        
        // Find matches
        const matches = wordlist.filter(w => w.startsWith(lowerWord));
        const isValid = wordlist.includes(lowerWord);

        return {
            success: true,
            word: lowerWord,
            language,
            isValid,
            suggestedMatches: matches.slice(0, 10),
            totalMatches: matches.length,
            wordlistSize: wordlist.length
        };
    } catch (error) {
        throw error;
    }
}
