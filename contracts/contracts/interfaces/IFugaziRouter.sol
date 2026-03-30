// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IFugaziRouter {
    function factory() external view returns (address);

    function submitOrder(
        address tokenIn,
        address tokenOut,
        InEuint128 memory encAmount,
        InEbool memory encIsBuy
    ) external;

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external;

    function claimOutput(address tokenA, address tokenB, uint32 batch) external;
}
