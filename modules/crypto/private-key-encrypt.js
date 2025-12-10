// modules/crypto/private-key-encrypt.js
// Encrypt private keys to Keystore JSON format (Web3 standard)

const crypto = require('crypto');
const Wallet = require('ethereumjs-wallet').default;

module.exports = {
    name: "Private Key Encrypter",
    slug: "private-key-encrypt",
    type: "api",
    version: "1.0.0",
    description: "Encrypt private keys to Web3 Keystore JSON format",

    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'encrypt-pk':
                    return encryptPrivateKey(params);
                case 'decrypt-keystore':
                    return decryptKeystore(params);
                case 'validate-keystore':
                    return validateKeystore(params);
                case 'batch-encrypt':
                    return batchEncrypt(params);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function encryptPrivateKey({ privateKey, password }) {
    try {
        if (!privateKey || !password) {
            return { success: false, error: 'privateKey and password are required' };
        }

        if (!privateKey.startsWith('0x')) {
            return { success: false, error: 'privateKey must start with 0x' };
        }

        if (privateKey.length !== 66) {
            return { success: false, error: 'privateKey must be 66 characters (including 0x)' };
        }

        // Create wallet from private key
        const wallet = Wallet.fromPrivateKey(Buffer.from(privateKey.slice(2), 'hex'));
        
        // Encrypt to keystore
        const encryptedKeystore = wallet.toV3String(password);
        const keystoreObj = JSON.parse(encryptedKeystore);

        return {
            success: true,
            message: 'Private key encrypted successfully',
            address: wallet.getAddressString(),
            keystore: keystoreObj,
            keystoreJSON: JSON.stringify(keystoreObj, null, 2),
            warning: 'Store this keystore file securely. The password is critical for decryption.',
            instructions: [
                '1. Save the keystore JSON to a file',
                '2. Store this file in a secure location',
                '3. Never share this file or password',
                '4. Remember the password - it cannot be recovered',
                '5. To import, use this keystore file with your password'
            ]
        };
    } catch (error) {
        throw error;
    }
}

function decryptKeystore({ keystore, password }) {
    try {
        if (!keystore || !password) {
            return { success: false, error: 'keystore and password are required' };
        }

        // Parse keystore if it's a string
        let keystoreObj = keystore;
        if (typeof keystore === 'string') {
            keystoreObj = JSON.parse(keystore);
        }

        // Validate keystore format
        if (!keystoreObj.version || !keystoreObj.crypto) {
            return { success: false, error: 'Invalid keystore format' };
        }

        // Decrypt wallet
        const wallet = Wallet.fromV3(keystoreObj, password);
        const address = wallet.getAddressString();
        const privateKey = wallet.getPrivateKeyString();

        return {
            success: true,
            message: 'Keystore decrypted successfully',
            address,
            privateKey,
            publicKey: wallet.getPublicKeyString(),
            warning: 'NEVER share this decrypted private key with anyone!',
            keystoreVersion: keystoreObj.version
        };
    } catch (error) {
        return {
            success: false,
            error: error.message.includes('could not decrypt') 
                ? 'Invalid password or corrupted keystore'
                : error.message
        };
    }
}

function validateKeystore({ keystore }) {
    try {
        if (!keystore) {
            return { success: false, error: 'keystore is required' };
        }

        let keystoreObj = keystore;
        if (typeof keystore === 'string') {
            keystoreObj = JSON.parse(keystore);
        }

        const validation = {
            hasVersion: !!keystoreObj.version,
            hasCrypto: !!keystoreObj.crypto,
            hasAddress: !!keystoreObj.address,
            hasId: !!keystoreObj.id,
            cryptoFields: keystoreObj.crypto ? Object.keys(keystoreObj.crypto) : []
        };

        const isValid = validation.hasVersion && validation.hasCrypto && validation.hasAddress;

        return {
            success: true,
            valid: isValid,
            validation,
            version: keystoreObj.version,
            address: keystoreObj.address,
            cipher: keystoreObj.crypto?.cipher || 'unknown',
            id: keystoreObj.id,
            message: isValid ? 'Valid keystore format' : 'Invalid keystore format'
        };
    } catch (error) {
        return {
            success: false,
            valid: false,
            error: 'Invalid JSON or keystore format: ' + error.message
        };
    }
}

function batchEncrypt({ privateKeys, password }) {
    try {
        if (!Array.isArray(privateKeys) || !password) {
            return { success: false, error: 'privateKeys (array) and password are required' };
        }

        const results = [];
        for (const pk of privateKeys) {
            try {
                const result = encryptPrivateKey({ privateKey: pk, password });
                if (result.success) {
                    results.push({
                        address: result.address,
                        keystore: result.keystoreJSON,
                        status: 'success'
                    });
                } else {
                    results.push({
                        privateKey: pk,
                        error: result.error,
                        status: 'failed'
                    });
                }
            } catch (err) {
                results.push({
                    privateKey: pk,
                    error: err.message,
                    status: 'failed'
                });
            }
        }

        const successful = results.filter(r => r.status === 'success').length;

        return {
            success: true,
            totalKeys: privateKeys.length,
            successful,
            failed: privateKeys.length - successful,
            results,
            warning: 'Store all keystores securely with the password'
        };
    } catch (error) {
        throw error;
    }
}
