// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFugaziPool.sol";

contract FugaziPool is IFugaziPool {
    using SafeERC20 for IERC20;

    uint256 internal constant WAD = 1e18;

    address public override token0;
    address public override token1;
    address public override keeper;
    uint32 public override currentBatch;
    uint32 public override batchSize;
    uint256 public override batchStartBlock;

    euint128 internal _reserve0;
    euint128 internal _reserve1;
    euint128 internal _totalShares;
    euint128 internal ZERO;

    struct Order {
        address owner;
        euint128 amount;
        ebool isBuy;
    }

    // per-batch accumulated net flows (written by _processOrder, read by executeBatch)
    euint128 internal _netBuy;
    euint128 internal _netSell;

    mapping(uint32 => Order[]) internal _batchOrders;
    mapping(uint32 => euint128) internal _batchNoise;
    mapping(uint32 => uint256) public batchBuyPrice;
    mapping(uint32 => uint256) public batchSellPrice;
    mapping(uint32 => bool) public override batchExecuted;
    mapping(uint32 => bool) public override noiseInjected;
    mapping(uint32 => mapping(address => euint128)) internal _pendingOut;
    mapping(uint32 => mapping(address => bool)) public outputClaimed;
    mapping(address => euint128) internal _lpShares;

    modifier onlyKeeper() {
        require(msg.sender == keeper, "not keeper");
        _;
    }

    constructor(
        address _token0,
        address _token1,
        uint32 _batchSize,
        address _keeper
    ) {
        require(_token0 < _token1, "token order");
        token0 = _token0;
        token1 = _token1;
        batchSize = _batchSize;
        keeper = _keeper;
        currentBatch = 1;
        batchStartBlock = block.number;
        ZERO = FHE.asEuint128(0);
        FHE.allowThis(ZERO);
    }

    function batchOrderCount(uint32 batch) external view override returns (uint32) {
        return uint32(_batchOrders[batch].length);
    }

    function submitOrder(
        InEuint128 memory encAmount,
        InEbool memory encIsBuy
    ) external override {
        uint32 batch = currentBatch;
        euint128 amount = FHE.asEuint128(encAmount);
        ebool isBuy = FHE.asEbool(encIsBuy);

        FHE.allowThis(amount);
        FHE.allowThis(isBuy);

        _batchOrders[batch].push(Order({
            owner: msg.sender,
            amount: amount,
            isBuy: isBuy
        }));

        uint32 idx = uint32(_batchOrders[batch].length - 1);
        emit OrderSubmitted(msg.sender, batch, idx);
    }

    function injectNoise(InEuint128 memory encNoise) external override onlyKeeper {
        uint32 batch = currentBatch;
        require(!noiseInjected[batch], "noise exists");

        euint128 noise = FHE.asEuint128(encNoise);
        FHE.allowThis(noise);
        _batchNoise[batch] = noise;
        noiseInjected[batch] = true;

        emit NoiseInjected(batch);
    }

    function postBatchPrice(
        uint32 batch,
        uint256 buyPrice,
        uint256 sellPrice
    ) external override onlyKeeper {
        require(!batchExecuted[batch], "already executed");
        require(buyPrice > 0 && sellPrice > 0, "zero price");
        batchBuyPrice[batch] = buyPrice;
        batchSellPrice[batch] = sellPrice;

        emit BatchPricePosted(batch, buyPrice, sellPrice);
    }

    function _processOrder(
        uint32 batch,
        Order storage o,
        euint128 encBuyPrice,
        euint128 encSellPrice,
        euint128 encWad
    ) internal {
        euint128 buyOut = FHE.div(FHE.mul(o.amount, encBuyPrice), encWad);
        euint128 sellOut = FHE.div(FHE.mul(o.amount, encSellPrice), encWad);
        FHE.allowThis(buyOut);
        FHE.allowThis(sellOut);

        euint128 outAmount = FHE.select(o.isBuy, buyOut, sellOut);
        FHE.allowThis(outAmount);

        _accumulateFlows(o.amount, o.isBuy);

        _pendingOut[batch][o.owner] = FHE.add(_pendingOut[batch][o.owner], outAmount);
        FHE.allowThis(_pendingOut[batch][o.owner]);
        FHE.allow(_pendingOut[batch][o.owner], o.owner);
    }

    function _accumulateFlows(euint128 amount, ebool isBuy) internal {
        euint128 buyContrib = FHE.select(isBuy, amount, ZERO);
        euint128 sellContrib = FHE.select(isBuy, ZERO, amount);
        FHE.allowThis(buyContrib);
        FHE.allowThis(sellContrib);

        _netBuy = FHE.add(_netBuy, buyContrib);
        _netSell = FHE.add(_netSell, sellContrib);
        FHE.allowThis(_netBuy);
        FHE.allowThis(_netSell);
    }

    function executeBatch(uint32 batch) external override {
        require(batch == currentBatch, "wrong batch");
        require(!batchExecuted[batch], "already executed");
        require(batchBuyPrice[batch] > 0, "no price");
        require(block.number >= batchStartBlock + batchSize, "batch not ripe");

        Order[] storage orders = _batchOrders[batch];
        uint32 count = uint32(orders.length);

        euint128 encBuyPrice = FHE.asEuint128(batchBuyPrice[batch]);
        euint128 encSellPrice = FHE.asEuint128(batchSellPrice[batch]);
        euint128 encWad = FHE.asEuint128(WAD);
        FHE.allowThis(encBuyPrice);
        FHE.allowThis(encSellPrice);
        FHE.allowThis(encWad);

        _netBuy = FHE.asEuint128(0);
        _netSell = FHE.asEuint128(0);
        FHE.allowThis(_netBuy);
        FHE.allowThis(_netSell);

        for (uint32 i = 0; i < count; i++) {
            _processOrder(batch, orders[i], encBuyPrice, encSellPrice, encWad);
        }

        _finalizeReserves(batch);

        batchExecuted[batch] = true;
        currentBatch = batch + 1;
        batchStartBlock = block.number;

        emit BatchExecuted(batch, count);
    }

    function _finalizeReserves(uint32 batch) internal {
        euint128 netBuy = _netBuy;
        euint128 netSell = _netSell;

        if (noiseInjected[batch]) {
            euint128 noise = _batchNoise[batch];
            netBuy = FHE.add(netBuy, noise);
            netSell = FHE.add(netSell, noise);
            FHE.allowThis(netBuy);
            FHE.allowThis(netSell);
        }

        _reserve0 = FHE.add(FHE.sub(_reserve0, netSell), netBuy);
        _reserve1 = FHE.add(FHE.sub(_reserve1, netBuy), netSell);
        FHE.allowThis(_reserve0);
        FHE.allowThis(_reserve1);
    }

    function claimOutput(uint32 batch) external override {
        require(batchExecuted[batch], "batch not executed");
        require(!outputClaimed[batch][msg.sender], "already claimed");

        outputClaimed[batch][msg.sender] = true;
        FHE.decrypt(_pendingOut[batch][msg.sender]);

        emit OutputClaimed(msg.sender, batch);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external override {
        require(amount0 > 0 && amount1 > 0, "zero amount");

        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        _addReserves(amount0, amount1);
        _addShares(amount0);

        emit LiquidityAdded(msg.sender, amount0, amount1);
    }

    function _addReserves(uint256 amount0, uint256 amount1) internal {
        euint128 enc0 = FHE.asEuint128(amount0);
        euint128 enc1 = FHE.asEuint128(amount1);
        FHE.allowThis(enc0);
        FHE.allowThis(enc1);

        _reserve0 = FHE.add(_reserve0, enc0);
        _reserve1 = FHE.add(_reserve1, enc1);
        FHE.allowThis(_reserve0);
        FHE.allowThis(_reserve1);
    }

    function _addShares(uint256 amount0) internal {
        euint128 shares = FHE.asEuint128(amount0);
        FHE.allowThis(shares);

        _lpShares[msg.sender] = FHE.add(_lpShares[msg.sender], shares);
        _totalShares = FHE.add(_totalShares, shares);
        FHE.allowThis(_lpShares[msg.sender]);
        FHE.allowThis(_totalShares);
        FHE.allowSender(_lpShares[msg.sender]);
    }

    function requestDecryptReserves() external override onlyKeeper {
        FHE.decrypt(_reserve0);
        FHE.decrypt(_reserve1);
    }

    function getDecryptedReserves()
        external
        view
        override
        returns (uint256 r0, uint256 r1, bool ready)
    {
        (uint256 v0, bool d0) = FHE.getDecryptResultSafe(_reserve0);
        (uint256 v1, bool d1) = FHE.getDecryptResultSafe(_reserve1);
        return (v0, v1, d0 && d1);
    }

    function requestDecryptShares() external {
        FHE.decrypt(_lpShares[msg.sender]);
    }

    function getDecryptedShares(address user)
        external
        view
        returns (uint256 shares, bool ready)
    {
        return FHE.getDecryptResultSafe(_lpShares[user]);
    }
}
