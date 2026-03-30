export const POOL_ADDRESS = process.env.NEXT_PUBLIC_POOL_ADDRESS ?? "";
export const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_ROUTER_ADDRESS ?? "";
export const TOKEN0_ADDRESS = process.env.NEXT_PUBLIC_TOKEN0_ADDRESS ?? "";
export const TOKEN1_ADDRESS = process.env.NEXT_PUBLIC_TOKEN1_ADDRESS ?? "";

export const POOL_ABI = [
  "function keeper() view returns (address)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function currentBatch() view returns (uint32)",
  "function batchSize() view returns (uint32)",
  "function batchStartBlock() view returns (uint256)",
  "function batchOrderCount(uint32 batch) view returns (uint32)",
  "function batchExecuted(uint32 batch) view returns (bool)",
  "function batchBuyPrice(uint32 batch) view returns (uint256)",
  "function batchSellPrice(uint32 batch) view returns (uint256)",
  "function noiseInjected(uint32 batch) view returns (bool)",
  "function submitOrder(tuple(bytes data) encAmount, tuple(bytes data) encIsBuy) external",
  "function postBatchPrice(uint32 batch, uint256 buyPrice, uint256 sellPrice) external",
  "function executeBatch(uint32 batch) external",
  "function claimOutput(uint32 batch) external",
  "function addLiquidity(uint256 amount0, uint256 amount1) external",
  "function requestDecryptReserves() external",
  "function getDecryptedReserves() view returns (uint256 r0, uint256 r1, bool ready)",
  "function requestDecryptShares() external",
  "function getDecryptedShares(address user) view returns (uint256 shares, bool ready)",
  "event OrderSubmitted(address indexed owner, uint32 indexed batch, uint32 index)",
  "event BatchPricePosted(uint32 indexed batch, uint256 buyPrice, uint256 sellPrice)",
  "event BatchExecuted(uint32 indexed batch, uint32 orderCount)",
  "event NoiseInjected(uint32 indexed batch)",
  "event OutputClaimed(address indexed user, uint32 indexed batch)",
  "event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1)",
] as const;

export const ROUTER_ABI = [
  "function submitOrder(address tokenIn, address tokenOut, tuple(bytes data) encAmount, tuple(bytes data) encIsBuy) external",
] as const;

export const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
] as const;
