// modules/data/text-cleaner.js
// Text Cleaner & Formatter Tool - Remove duplicates, format, minify

module.exports = {
    name: "Text Cleaner",
    slug: "text-cleaner",
    type: "api",
    version: "1.0.0",
    description: "Clean, format, and transform text (remove duplicates, sort, minify JSON)",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'remove-duplicates':
                    return removeDuplicates(params);
                case 'sort-lines':
                    return sortLines(params);
                case 'format-json':
                    return formatJson(params);
                case 'minify-text':
                    return minifyText(params);
                case 'normalize-whitespace':
                    return normalizeWhitespace(params);
                case 'split-text':
                    return splitText(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Remove duplicate lines
function removeDuplicates(params) {
    const { text, caseSensitive = false } = params;

    if (!text) throw new Error('Text is required');

    const lines = text.split('\n');
    const seen = new Set();
    const unique = [];

    for (const line of lines) {
        const key = caseSensitive ? line : line.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(line);
        }
    }

    return {
        status: true,
        action: 'remove-duplicates',
        inputLines: lines.length,
        outputLines: unique.length,
        duplicatesRemoved: lines.length - unique.length,
        result: unique.join('\n'),
        caseSensitive,
        timestamp: new Date().toISOString()
    };
}

// Sort lines
function sortLines(params) {
    const { text, reverse = false, numeric = false, caseSensitive = true } = params;

    if (!text) throw new Error('Text is required');

    let lines = text.split('\n');

    if (numeric) {
        lines.sort((a, b) => {
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            return reverse ? bNum - aNum : aNum - bNum;
        });
    } else {
        lines.sort((a, b) => {
            const aVal = caseSensitive ? a : a.toLowerCase();
            const bVal = caseSensitive ? b : b.toLowerCase();
            return reverse ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        });
    }

    return {
        status: true,
        action: 'sort-lines',
        lines: lines.length,
        sorted: true,
        reverse,
        numeric,
        result: lines.join('\n'),
        timestamp: new Date().toISOString()
    };
}

// Format JSON
function formatJson(params) {
    const { json, indent = 2, minify = false } = params;

    if (!json) throw new Error('JSON string is required');

    try {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        const formatted = minify 
            ? JSON.stringify(parsed) 
            : JSON.stringify(parsed, null, indent);

        const originalSize = JSON.stringify(parsed).length;
        const newSize = formatted.length;

        return {
            status: true,
            action: 'format-json',
            valid: true,
            minified: minify,
            indent,
            originalSize,
            newSize,
            reduction: ((1 - newSize / originalSize) * 100).toFixed(2) + '%',
            result: formatted,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: false,
            action: 'format-json',
            valid: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Minify text (remove extra whitespace)
function minifyText(params) {
    const { text, removeNewlines = true, removeComments = false } = params;

    if (!text) throw new Error('Text is required');

    let result = text;

    // Remove multiple spaces
    result = result.replace(/  +/g, ' ');

    // Remove leading/trailing whitespace per line
    result = result.split('\n').map(line => line.trim()).join(removeNewlines ? ' ' : '\n');

    // Remove comments if requested
    if (removeComments) {
        result = result.replace(/\/\/.*$/gm, ''); // Remove // comments
        result = result.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ comments
    }

    return {
        status: true,
        action: 'minify-text',
        originalSize: text.length,
        minifiedSize: result.length,
        reduction: ((1 - result.length / text.length) * 100).toFixed(2) + '%',
        result,
        removeNewlines,
        removeComments,
        timestamp: new Date().toISOString()
    };
}

// Normalize whitespace
function normalizeWhitespace(params) {
    const { text, removeTrailingSpaces = true, removeTabs = true, normalizeNewlines = true } = params;

    if (!text) throw new Error('Text is required');

    let result = text;

    if (removeTrailingSpaces) {
        result = result.split('\n').map(line => line.trimEnd()).join('\n');
    }

    if (removeTabs) {
        result = result.replace(/\t/g, '    '); // Replace tabs with 4 spaces
    }

    if (normalizeNewlines) {
        result = result.replace(/\r\n/g, '\n'); // Convert Windows to Unix
        result = result.replace(/\r/g, '\n'); // Convert old Mac to Unix
        result = result.replace(/\n\n+/g, '\n\n'); // Remove multiple blank lines
    }

    return {
        status: true,
        action: 'normalize-whitespace',
        originalSize: text.length,
        normalizedSize: result.length,
        removeTrailingSpaces,
        removeTabs,
        normalizeNewlines,
        result,
        timestamp: new Date().toISOString()
    };
}

// Split text by delimiter
function splitText(params) {
    const { text, delimiter = '\n', limit } = params;

    if (!text) throw new Error('Text is required');

    let parts = text.split(delimiter);
    if (limit && limit > 0) {
        parts = parts.slice(0, limit);
    }

    return {
        status: true,
        action: 'split-text',
        delimiter,
        totalParts: parts.length,
        limited: limit ? limit > 0 : false,
        limit,
        parts,
        timestamp: new Date().toISOString()
    };
}
