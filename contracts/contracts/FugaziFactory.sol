// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./FugaziPool.sol";

contract FugaziFactory {
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;
    address public keeper;

    event PoolCreated(address indexed token0, address indexed token1, address pool);

    constructor(address _keeper) {
        keeper = _keeper;
    }

    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    function createPool(
        address tokenA,
        address tokenB,
        uint32 batchSize
    ) external returns (address pool) {
        require(tokenA != tokenB, "identical tokens");
        (address t0, address t1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(t0 != address(0), "zero address");
        require(getPool[t0][t1] == address(0), "pool exists");

        pool = address(new FugaziPool(t0, t1, batchSize, keeper));
        getPool[t0][t1] = pool;
        getPool[t1][t0] = pool;
        allPools.push(pool);

        emit PoolCreated(t0, t1, pool);
    }
}
