// modules/dev/json-validator.js
// Validate, format, and minify JSON

const { Validator } = require('jsonschema');

module.exports = {
    name: "JSON Validator",
    slug: "json-validator",
    type: "api",
    version: "1.0.0",
    description: "Validate, format, and minify JSON with schema support",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'validate-json':
                    return validateJSON(params);
                case 'format-json':
                    return formatJSON(params);
                case 'minify-json':
                    return minifyJSON(params);
                case 'validate-schema':
                    return validateSchema(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function validateJSON({ json, strict = true }) {
    if (!json) {
        return { success: false, error: 'json is required' };
    }

    try {
        let parsed;
        if (typeof json === 'string') {
            parsed = JSON.parse(json);
        } else {
            parsed = json;
        }

        // Get stats
        const stats = {
            type: Array.isArray(parsed) ? 'array' : typeof parsed,
            size: JSON.stringify(parsed).length,
            keys: typeof parsed === 'object' ? Object.keys(parsed).length : 0,
            depth: getDepth(parsed),
            isEmpty: Object.keys(parsed).length === 0
        };

        return {
            success: true,
            valid: true,
            message: 'Valid JSON',
            stats,
            preview: JSON.stringify(parsed).substring(0, 100) + '...'
        };
    } catch (error) {
        return {
            success: false,
            valid: false,
            error: error.message,
            line: error.message.match(/line (\d+)/) ? error.message.match(/line (\d+)/)[1] : null
        };
    }
}

function formatJSON({ json, indent = 2 }) {
    if (!json) {
        return { success: false, error: 'json is required' };
    }

    try {
        let parsed;
        if (typeof json === 'string') {
            parsed = JSON.parse(json);
        } else {
            parsed = json;
        }

        const formatted = JSON.stringify(parsed, null, indent);

        return {
            success: true,
            formatted,
            originalSize: JSON.stringify(parsed).length,
            formattedSize: formatted.length,
            lines: formatted.split('\n').length
        };
    } catch (error) {
        return { success: false, error: 'Format failed: ' + error.message };
    }
}

function minifyJSON({ json }) {
    if (!json) {
        return { success: false, error: 'json is required' };
    }

    try {
        let parsed;
        if (typeof json === 'string') {
            parsed = JSON.parse(json);
        } else {
            parsed = json;
        }

        const minified = JSON.stringify(parsed);
        const original = JSON.stringify(parsed, null, 2);

        const reduction = Math.round(((original.length - minified.length) / original.length) * 100);

        return {
            success: true,
            minified,
            originalSize: original.length,
            minifiedSize: minified.length,
            reduction: reduction + '%',
            saved: original.length - minified.length + ' bytes'
        };
    } catch (error) {
        return { success: false, error: 'Minification failed: ' + error.message };
    }
}

function validateSchema({ json, schema }) {
    if (!json || !schema) {
        return { success: false, error: 'json and schema are required' };
    }

    try {
        let data;
        let schemaObj;

        // Parse inputs
        if (typeof json === 'string') {
            data = JSON.parse(json);
        } else {
            data = json;
        }

        if (typeof schema === 'string') {
            schemaObj = JSON.parse(schema);
        } else {
            schemaObj = schema;
        }

        // Validate
        const validator = new Validator();
        const result = validator.validate(data, schemaObj);

        const validation = {
            valid: result.valid,
            errors: result.errors.map(err => ({
                property: err.property,
                message: err.message,
                schema: err.schema
            })),
            errorCount: result.errors.length
        };

        return {
            success: true,
            ...validation,
            message: result.valid ? 'JSON matches schema' : `${result.errors.length} validation error(s)`
        };
    } catch (error) {
        return { success: false, error: 'Validation failed: ' + error.message };
    }
}

function getDepth(obj, depth = 0) {
    if (typeof obj !== 'object' || obj === null) {
        return depth;
    }

    let maxDepth = depth;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const childDepth = getDepth(obj[key], depth + 1);
            maxDepth = Math.max(maxDepth, childDepth);
        }
    }

    return maxDepth;
}
