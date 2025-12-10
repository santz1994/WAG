// modules/dev/regex-tester.js
// Test and debug regular expressions

module.exports = {
    name: "RegEx Tester",
    slug: "regex-tester",
    type: "api",
    version: "1.0.0",
    description: "Test, validate, and debug regular expressions",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'test-pattern':
                    return testPattern(params);
                case 'extract-matches':
                    return extractMatches(params);
                case 'replace-pattern':
                    return replacePattern(params);
                case 'validate-regex':
                    return validateRegex(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function testPattern({ text, pattern, flags = 'g' }) {
    if (!text || !pattern) {
        return { success: false, error: 'text and pattern are required' };
    }

    try {
        const regex = new RegExp(pattern, flags);
        const matches = text.match(regex);

        return {
            success: true,
            pattern,
            flags,
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            matches: matches || [],
            matchCount: matches ? matches.length : 0,
            hasMatches: !!matches
        };
    } catch (error) {
        return { success: false, error: 'Invalid regex: ' + error.message };
    }
}

function extractMatches({ text, pattern, flags = 'g', groups = false }) {
    if (!text || !pattern) {
        return { success: false, error: 'text and pattern are required' };
    }

    try {
        const regex = new RegExp(pattern, flags);
        const matches = [];

        let match;
        if (groups) {
            // Extract matches with capture groups
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    full: match[0],
                    groups: match.slice(1),
                    index: match.index
                });
            }
        } else {
            // Simple extraction
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    match: match[0],
                    index: match.index
                });
            }
        }

        return {
            success: true,
            pattern,
            flags,
            matchCount: matches.length,
            matches: matches.slice(0, 100) // Limit to 100 matches
        };
    } catch (error) {
        return { success: false, error: 'Extraction failed: ' + error.message };
    }
}

function replacePattern({ text, pattern, replacement, flags = 'g' }) {
    if (!text || !pattern || replacement === undefined) {
        return { success: false, error: 'text, pattern, and replacement are required' };
    }

    try {
        const regex = new RegExp(pattern, flags);
        const result = text.replace(regex, replacement);

        const originalLength = text.length;
        const resultLength = result.length;

        return {
            success: true,
            pattern,
            replacement,
            flags,
            originalLength,
            resultLength,
            result,
            changed: originalLength !== resultLength
        };
    } catch (error) {
        return { success: false, error: 'Replacement failed: ' + error.message };
    }
}

function validateRegex({ pattern, flags = 'g' }) {
    if (!pattern) {
        return { success: false, error: 'pattern is required' };
    }

    try {
        const regex = new RegExp(pattern, flags);

        // Test with sample strings to understand behavior
        const testCases = [
            { input: '', description: 'empty string' },
            { input: 'test', description: 'simple text' },
            { input: '123', description: 'numbers' },
            { input: 'TEST', description: 'uppercase' }
        ];

        const testResults = testCases.map(test => {
            try {
                const matches = test.input.match(regex);
                return {
                    input: test.input,
                    description: test.description,
                    matches: matches ? matches.length : 0,
                    matched: !!matches
                };
            } catch (e) {
                return {
                    input: test.input,
                    description: test.description,
                    error: e.message
                };
            }
        });

        return {
            success: true,
            pattern,
            flags,
            valid: true,
            characteristics: {
                global: regex.global,
                ignoreCase: regex.ignoreCase,
                multiline: regex.multiline,
                dotAll: regex.dotAll,
                unicode: regex.unicode,
                sticky: regex.sticky
            },
            testResults
        };
    } catch (error) {
        return {
            success: false,
            pattern,
            error: 'Invalid regex: ' + error.message,
            valid: false
        };
    }
}
