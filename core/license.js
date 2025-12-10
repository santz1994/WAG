// core/license.js - License & Token Verification
// Blockchain-based license gate for WAG Platform

const { ethers } = require('ethers');

const CONFIG = {
    TOKEN_ADDRESS: process.env.TOKEN_ADDRESS || "0x4e928F638cFD2F1c75437A41E2d386df79eeE680",
    MIN_HOLDING: parseInt(process.env.MIN_HOLDING) || 1000,
    RPC_URL: process.env.RPC_URL || "https://rpc-amoy.polygon.technology"
};

// Check if wallet has valid license (minimum token holding)
async function checkLicense(userWallet) {
    try {
        if (!ethers.isAddress(userWallet)) {
            return { valid: false, reason: 'Invalid wallet address' };
        }

        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(CONFIG.TOKEN_ADDRESS, ABI, provider);
        
        const rawBalance = await contract.balanceOf(userWallet);
        const decimals = await contract.decimals();
        const balance = ethers.formatUnits(rawBalance, decimals);
        const balanceNum = parseFloat(balance);

        const isValid = balanceNum >= CONFIG.MIN_HOLDING;

        return {
            valid: isValid,
            wallet: userWallet,
            balance: balanceNum,
            minRequired: CONFIG.MIN_HOLDING,
            reason: isValid ? 'License granted' : `Insufficient balance: ${balanceNum} < ${CONFIG.MIN_HOLDING}`
        };
    } catch (error) {
        console.error("❌ License Check Error:", error.message);
        return { valid: false, reason: `Error checking license: ${error.message}` };
    }
}

// Get detailed balance info
async function getBalanceInfo(userWallet) {
    try {
        if (!ethers.isAddress(userWallet)) {
            throw new Error('Invalid wallet address');
        }

        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function name() view returns (string)",
            "function symbol() view returns (string)"
        ];
        const contract = new ethers.Contract(CONFIG.TOKEN_ADDRESS, ABI, provider);
        
        const rawBalance = await contract.balanceOf(userWallet);
        const decimals = await contract.decimals();
        const balance = ethers.formatUnits(rawBalance, decimals);
        const name = await contract.name();
        const symbol = await contract.symbol();

        return {
            wallet: userWallet,
            balance: parseFloat(balance),
            decimals,
            tokenName: name,
            tokenSymbol: symbol,
            minRequired: CONFIG.MIN_HOLDING,
            licensed: parseFloat(balance) >= CONFIG.MIN_HOLDING
        };
    } catch (error) {
        throw new Error(`Failed to get balance: ${error.message}`);
    }
}

// Validate wallet format
function isValidWallet(address) {
    return ethers.isAddress(address);
}

module.exports = {
    checkLicense,
    getBalanceInfo,
    isValidWallet,
    CONFIG
};
