// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./FugaziFactory.sol";
import "./FugaziPool.sol";
import "./interfaces/IFugaziRouter.sol";

contract FugaziRouter is IFugaziRouter {
    using SafeERC20 for IERC20;

    address public override factory;

    constructor(address _factory) {
        factory = _factory;
    }

    function _getPool(address tokenA, address tokenB) internal view returns (FugaziPool) {
        address pool = FugaziFactory(factory).getPool(tokenA, tokenB);
        require(pool != address(0), "pool not found");
        return FugaziPool(pool);
    }

    function submitOrder(
        address tokenIn,
        address tokenOut,
        InEuint128 memory encAmount,
        InEbool memory encIsBuy
    ) external override {
        FugaziPool pool = _getPool(tokenIn, tokenOut);
        pool.submitOrder(encAmount, encIsBuy);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external override {
        FugaziPool pool = _getPool(tokenA, tokenB);

        (address t0,) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (uint256 a0, uint256 a1) = tokenA == t0
            ? (amountA, amountB)
            : (amountB, amountA);

        IERC20(pool.token0()).safeTransferFrom(msg.sender, address(pool), a0);
        IERC20(pool.token1()).safeTransferFrom(msg.sender, address(pool), a1);

        pool.addLiquidity(a0, a1);
    }

    function claimOutput(
        address tokenA,
        address tokenB,
        uint32 batch
    ) external override {
        FugaziPool pool = _getPool(tokenA, tokenB);
        pool.claimOutput(batch);
    }
}
