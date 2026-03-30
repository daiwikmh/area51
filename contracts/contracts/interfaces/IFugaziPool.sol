// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IFugaziPool {
    event OrderSubmitted(address indexed owner, uint32 indexed batch, uint32 index);
    event BatchPricePosted(uint32 indexed batch, uint256 buyPrice, uint256 sellPrice);
    event BatchExecuted(uint32 indexed batch, uint32 orderCount);
    event NoiseInjected(uint32 indexed batch);
    event OutputClaimed(address indexed user, uint32 indexed batch);
    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(address indexed provider);

    function token0() external view returns (address);
    function token1() external view returns (address);
    function currentBatch() external view returns (uint32);
    function batchSize() external view returns (uint32);
    function batchStartBlock() external view returns (uint256);
    function batchOrderCount(uint32 batch) external view returns (uint32);
    function batchExecuted(uint32 batch) external view returns (bool);
    function noiseInjected(uint32 batch) external view returns (bool);
    function keeper() external view returns (address);

    function submitOrder(InEuint128 memory encAmount, InEbool memory encIsBuy) external;
    function injectNoise(InEuint128 memory encNoise) external;
    function postBatchPrice(uint32 batch, uint256 buyPrice, uint256 sellPrice) external;
    function executeBatch(uint32 batch) external;
    function claimOutput(uint32 batch) external;
    function addLiquidity(uint256 amount0, uint256 amount1) external;
    function requestDecryptReserves() external;
    function getDecryptedReserves() external view returns (uint256 r0, uint256 r1, bool ready);
}
