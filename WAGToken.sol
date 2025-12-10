// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title WAGToken
 * @dev WAG Token - WhatsApp Gateway Token
 * ERC-20 Token untuk licensing WAG Tool
 * Total Supply: 1,000,000 tokens
 * Gunakan contract ini untuk deploy di Polygon Mainnet
 */
contract WAGToken is ERC20 {
    constructor() ERC20("WhatsApp Gateway Token", "WAG") {
        // Mint 1 juta token kepada creator
        // 10^18 adalah 1 token (18 decimals adalah standard ERC-20)
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * Informasi tambahan:
     * - Total Supply: 1,000,000 WAG
     * - Decimals: 18
     * - Blockchain: Polygon (PoS)
     * 
     * Deployment:
     * 1. Buka https://remix.ethereum.org
     * 2. Buat file baru: WAGToken.sol
     * 3. Copy-paste kode ini
     * 4. Compile (Solidity 0.8.x)
     * 5. Deploy dengan Injected Provider (MetaMask on Polygon)
     * 6. Catat Contract Address
     * 7. Masukkan di .env file
     */
}
