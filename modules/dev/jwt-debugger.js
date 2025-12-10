// modules/dev/jwt-debugger.js
// Decode, validate, and generate JWT tokens

const crypto = require('crypto');

module.exports = {
    name: "JWT Debugger",
    slug: "jwt-debugger",
    type: "api",
    version: "1.0.0",
    description: "Decode, validate, and generate JWT tokens",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'decode-jwt':
                    return decodeJWT(params);
                case 'verify-signature':
                    return verifySignature(params);
                case 'generate-jwt':
                    return generateJWT(params);
                case 'analyze-claims':
                    return analyzeClaims(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function decodeJWT({ token }) {
    if (!token) {
        return { success: false, error: 'token is required' };
    }

    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { success: false, error: 'Invalid JWT format (must have 3 parts)' };
        }

        const [headerB64, payloadB64, signature] = parts;

        // Decode header
        const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
        
        // Decode payload
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

        // Calculate expiry status
        let expiryStatus = null;
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            const expiresIn = payload.exp - now;
            expiryStatus = {
                expiresAt: new Date(payload.exp * 1000).toISOString(),
                expiresIn: expiresIn + ' seconds',
                expired: expiresIn < 0
            };
        }

        return {
            success: true,
            header,
            payload,
            signature: signature.substring(0, 20) + '...',
            expiryStatus,
            valid: true
        };
    } catch (error) {
        return { success: false, error: 'Failed to decode JWT: ' + error.message };
    }
}

function verifySignature({ token, secret, algorithm = 'HS256' }) {
    if (!token || !secret) {
        return { success: false, error: 'token and secret are required' };
    }

    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { success: false, error: 'Invalid JWT format' };
        }

        const [headerB64, payloadB64, signature] = parts;
        const message = `${headerB64}.${payloadB64}`;

        // Verify signature based on algorithm
        let expectedSignature;
        if (algorithm.startsWith('HS')) {
            const hashAlgo = algorithm.replace('HS', 'sha') + '';
            expectedSignature = crypto
                .createHmac(hashAlgo, secret)
                .update(message)
                .digest('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        } else {
            return { success: false, error: `Algorithm ${algorithm} verification not supported in this mode` };
        }

        const isValid = signature === expectedSignature;

        return {
            success: true,
            valid: isValid,
            algorithm,
            signature: signature.substring(0, 20) + '...',
            expected: expectedSignature.substring(0, 20) + '...'
        };
    } catch (error) {
        return { success: false, error: 'Verification failed: ' + error.message };
    }
}

function generateJWT({ payload, secret, algorithm = 'HS256', expiresIn = 3600 }) {
    if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'payload must be an object' };
    }

    if (!secret) {
        return { success: false, error: 'secret is required' };
    }

    try {
        // Create header
        const header = { alg: algorithm, typ: 'JWT' };

        // Add expiry to payload if specified
        const claims = { ...payload };
        if (expiresIn) {
            claims.exp = Math.floor(Date.now() / 1000) + expiresIn;
            claims.iat = Math.floor(Date.now() / 1000);
        }

        // Encode header and payload
        const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        const message = `${headerB64}.${payloadB64}`;

        // Sign
        let signature;
        if (algorithm.startsWith('HS')) {
            const hashAlgo = algorithm.replace('HS', 'sha') + '';
            signature = crypto
                .createHmac(hashAlgo, secret)
                .update(message)
                .digest('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        } else {
            return { success: false, error: `Algorithm ${algorithm} not supported` };
        }

        const token = `${message}.${signature}`;

        return {
            success: true,
            token,
            header,
            payload: claims,
            algorithm,
            expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : null
        };
    } catch (error) {
        return { success: false, error: 'Token generation failed: ' + error.message };
    }
}

function analyzeClaims({ token }) {
    if (!token) {
        return { success: false, error: 'token is required' };
    }

    try {
        const decoded = decodeJWT({ token });
        if (!decoded.success) return decoded;

        const payload = decoded.payload;
        const claims = {};

        // Standard claims
        if (payload.iss) claims.issuer = payload.iss;
        if (payload.sub) claims.subject = payload.sub;
        if (payload.aud) claims.audience = payload.aud;
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            claims.expiration = {
                timestamp: payload.exp,
                date: new Date(payload.exp * 1000).toISOString(),
                expired: payload.exp < now,
                expiresIn: payload.exp - now + ' seconds'
            };
        }
        if (payload.nbf) claims.notBefore = new Date(payload.nbf * 1000).toISOString();
        if (payload.iat) claims.issuedAt = new Date(payload.iat * 1000).toISOString();
        if (payload.jti) claims.jwtId = payload.jti;

        // Custom claims
        const customClaims = {};
        for (const [key, value] of Object.entries(payload)) {
            if (!['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'].includes(key)) {
                customClaims[key] = value;
            }
        }

        return {
            success: true,
            standardClaims: claims,
            customClaims,
            allClaims: payload,
            claimCount: Object.keys(payload).length
        };
    } catch (error) {
        return { success: false, error: 'Analysis failed: ' + error.message };
    }
}
