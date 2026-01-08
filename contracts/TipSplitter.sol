// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TipSplitter
 * @notice Atomic tip splitting contract for CryptoBio
 * @dev Splits incoming tips: 99% to creator, 1% to platform
 */
contract TipSplitter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Platform wallet that receives fees
    address public immutable platformWallet;
    
    // Fee in basis points (100 = 1%)
    uint256 public constant PLATFORM_FEE_BPS = 100;
    
    // Denominator for basis point calculations
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Events
    event TipSent(
        address indexed token,
        address indexed from,
        address indexed creator,
        uint256 totalAmount,
        uint256 creatorAmount,
        uint256 platformFee
    );

    /**
     * @param _platformWallet Address that receives platform fees
     */
    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    /**
     * @notice Send a tip to a creator with automatic fee split
     * @param token ERC20 token address (e.g., USDC)
     * @param creator Creator's wallet address
     * @param amount Total tip amount (platform fee will be deducted)
     */
    function tip(
        address token,
        address creator,
        uint256 amount
    ) external nonReentrant {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than 0");

        // Calculate split
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorAmount = amount - platformFee;

        // Transfer from sender to creator (99%)
        IERC20(token).safeTransferFrom(msg.sender, creator, creatorAmount);
        
        // Transfer from sender to platform (1%)
        if (platformFee > 0) {
            IERC20(token).safeTransferFrom(msg.sender, platformWallet, platformFee);
        }

        emit TipSent(token, msg.sender, creator, amount, creatorAmount, platformFee);
    }

    /**
     * @notice Send a tip in native currency (ETH) with automatic fee split
     * @param creator Creator's wallet address
     */
    function tipETH(address payable creator) external payable nonReentrant {
        require(creator != address(0), "Invalid creator address");
        require(msg.value > 0, "Amount must be greater than 0");

        // Calculate split
        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorAmount = msg.value - platformFee;

        // Transfer to creator (99%)
        (bool creatorSuccess, ) = creator.call{value: creatorAmount}("");
        require(creatorSuccess, "Creator transfer failed");

        // Transfer to platform (1%)
        if (platformFee > 0) {
            (bool platformSuccess, ) = platformWallet.call{value: platformFee}("");
            require(platformSuccess, "Platform transfer failed");
        }

        emit TipSent(address(0), msg.sender, creator, msg.value, creatorAmount, platformFee);
    }

    /**
     * @notice Calculate the fee split for a given amount
     * @param amount Total tip amount
     * @return creatorAmount Amount creator will receive
     * @return platformFee Amount platform will receive
     */
    function calculateSplit(uint256 amount) 
        external 
        pure 
        returns (uint256 creatorAmount, uint256 platformFee) 
    {
        platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        creatorAmount = amount - platformFee;
    }
}



