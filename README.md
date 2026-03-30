# Fugazi

An AMM-based dark pool DEX built on Fhenix CoFHE (Fully Homomorphic Encryption). Individual order sizes and directions are hidden via FHE — the contract never processes plaintext trade data. Orders are batched together and a symmetric noise order is injected each round, so an on-chain observer sees only aggregate encrypted flows, never individual positions.

## How It Works

Traditional DEXes leak trade intent the moment a transaction hits the mempool. Fugazi encrypts every order at submission using cofhejs client-side encryption before it leaves the browser. The ciphertext is submitted directly to the contract via the router. The pool accumulates orders in an encrypted batch queue and executes them all at once using FHE arithmetic — no plaintext amounts ever appear on-chain.

### Batch Lifecycle

```
1. User encrypts amount + direction (buy/sell) client-side via cofhejs
2. submitOrder() — encrypted order enters batch queue
3. Keeper calls requestDecryptReserves() to unseal r0, r1 asynchronously
4. Keeper reads plaintext reserves via getDecryptedReserves() once ready
5. Keeper computes WAD prices: buyPrice = (r1 * 1e18) / r0
6. Keeper calls postBatchPrice() + injectNoise() with a random encrypted amount
7. Anyone calls executeBatch() after batchSize blocks have elapsed
8. FHE arithmetic: outAmount = select(isBuy, amount * buyPrice, amount * sellPrice)
9. Net flows update encrypted reserves: reserve0 += netBuy - netSell
10. User calls claimOutput() to trigger async FHE decrypt of their pending output
```

The noise order added by the keeper is symmetric — it adds the same encrypted value to both `netBuy` and `netSell`, so it cancels out in the reserve update but makes the aggregate totals unreadable to an outside observer.

### Why a Keeper

Fhenix CoFHE supports `FHE.div(euintN, euintN)` but price computation via encrypted division would require the result to remain encrypted — making WAD scaling and cross-batch consistency impractical. The keeper pattern solves this: reserves are decrypted via the async `FHE.decrypt` + `FHE.getDecryptResultSafe` flow, the keeper reads plaintext values off-chain, computes `price = r1/r0` as a plain BigInt, and posts it as a WAD-scaled `uint256`. The contract then does `FHE.mul(encAmount, encPrice)` — encrypted multiplication with a plaintext-derived scalar — which CoFHE handles efficiently.

---

## Repository Structure

```
phe/
├── contracts/          Hardhat project — Solidity contracts + tests + keeper script
│   ├── contracts/
│   │   ├── FugaziPool.sol       Core pool: encrypted reserves, batch queue, noise, LP shares
│   │   ├── FugaziFactory.sol    Deploys and indexes pools by token pair
│   │   ├── FugaziRouter.sol     User-facing entry point, routes by (tokenIn, tokenOut)
│   │   ├── MockERC20.sol        Mintable test token
│   │   └── interfaces/
│   │       ├── IFugaziPool.sol
│   │       └── IFugaziRouter.sol
│   ├── scripts/
│   │   ├── deploy.ts            Deploys all contracts + creates pool + mints test tokens
│   │   ├── mint.ts              Standalone mint script (run separately if deploy mint fails)
│   │   └── price-keeper.ts      Off-chain keeper: unseal reserves, post price, inject noise
│   ├── test/
│   │   └── FugaziPool.test.ts   13 test cases against cofhe mock network
│   └── hardhat.config.ts        Networks: hardhat, eth-sepolia, arb-sepolia, nitrogen
│
└── area51/             Next.js 16 frontend + API routes
    ├── app/
    │   ├── page.tsx              Landing page (hero, HowItWorks, PrivacySection)
    │   ├── layout.tsx            Root layout + providers
    │   ├── providers.tsx         WagmiProvider + QueryClientProvider
    │   ├── (landing)/            Landing route group
    │   │   └── components/
    │   │       ├── ParticleCanvas.tsx   Dynamic-loaded WebGL particle swarm
    │   │       ├── LandingHeader.tsx    Nav header
    │   │       ├── HowItWorks.tsx       3-step explainer with animated diagram
    │   │       └── PrivacySection.tsx   Feature grid + tabbed code examples
    │   ├── (dashboard)/          Authenticated route group — shared sidebar layout
    │   │   ├── layout.tsx        Sidebar: logo, nav, wallet connect, profile, powered-by
    │   │   ├── dashboard/        Main dashboard page
    │   │   │   ├── page.tsx
    │   │   │   └── components/
    │   │   │       ├── Dashboard.tsx        Polling root — 2s interval, assembles state
    │   │   │       ├── StatRow.tsx          6-up stat cards: batch, blocks, orders, price, noise, keeper
    │   │   │       ├── Topbar.tsx           Status badge + pool address
    │   │   │       ├── SwapPanel.tsx        Encrypted order submission form
    │   │   │       ├── LiquidityPanel.tsx   Add/remove LP tabs
    │   │   │       ├── BatchQueuePanel.tsx  Live order queue + Execute Batch button
    │   │   │       ├── ActivityLog.tsx      Contract event feed
    │   │   │       └── ReservePanel.tsx     Keeper-only sealed reserve viewer
    │   │   ├── components/
    │   │   │   ├── ConnectWallet.tsx    MetaMask EIP-1193 connect button
    │   │   │   └── SidebarProfile.tsx   Connected address + network label
    │   │   ├── swap/page.tsx
    │   │   ├── pool/page.tsx
    │   │   └── batches/page.tsx
    │   └── api/
    │       ├── state/route.ts    GET — reads on-chain state via ethers (server-side)
    │       ├── order/route.ts    POST — submits encrypted order to pool
    │       ├── execute/route.ts  POST — calls executeBatch (permissionless)
    │       ├── unseal/route.ts   POST — returns sealed reserve blobs for client decrypt
    │       └── keeper/route.ts   POST — keeper round: unseal reserves, post price, inject noise
    ├── lib/
    │   ├── contracts.ts     ABI definitions + deployed address constants from env
    │   ├── dashboard.ts     TypeScript types: DashboardState, LogEntry, BatchOrder, KeeperMode
    │   ├── fhe.ts           cofhejs browser init + encryptUint128 / encryptBool helpers
    │   ├── metamask.ts      MetaMask Connect EVM singleton: connect, disconnect, subscribe
    │   └── wagmi.ts         Fhenix Nitrogen chain definition + wagmiConfig
    └── canvas.tsx           Three.js particle swarm (20k instanced tetrahedra, bloom post-fx)
```

---

## Deployed Contracts (Ethereum Sepolia)

| Contract | Address |
|---|---|
| FugaziPool | `0x0cE1B1364fCf25D8Fa486347e68658C7701f8c6d` |
| FugaziRouter | `0xBb5730626c31035Df9D6F5c9c05Ba9B1f386FCb8` |
| FugaziFactory | `0xa2b457DAb5b0710A5B8063f813e5fbE3A19deb33` |
| Token A (FZA) | `0x549F6adcBD1c9583883b9D684263Eba910D0A9fE` |
| Token B (FZB) | `0xAC0bE398120ef23865fFbaDaf1af6CC5b1877776` |

Keeper / deployer: `0x445bf5fe58f2Fe5009eD79cFB1005703D68cbF85`
Batch size: 10 blocks (~2 minutes on Sepolia)

---

## Contract Architecture

### FugaziPool

The core contract. All financially sensitive values are stored as `euint128` (encrypted 128-bit unsigned integers) managed by the Fhenix CoFHE coprocessor.

**Encrypted storage:**

| Field | Type | Who can read |
|---|---|---|
| `_reserve0`, `_reserve1` | `euint128` | Keeper (via async decrypt) |
| `_lpShares[user]` | `euint128` | User (via async decrypt) |
| `_totalShares` | `euint128` | Contract only |
| `order.amount` | `euint128` | Contract only |
| `order.isBuy` | `ebool` | Contract only |
| `_batchNoise[batch]` | `euint128` | Contract only |
| `_pendingOut[batch][user]` | `euint128` | User (after executeBatch) |

**Public storage** (necessarily visible for coordination):

| Field | Type |
|---|---|
| `batchBuyPrice[batch]` | `uint256` WAD — keeper posts |
| `batchSellPrice[batch]` | `uint256` WAD — keeper posts |
| `batchExecuted[batch]` | `bool` |
| `noiseInjected[batch]` | `bool` |
| `order.owner` | `address` — needed to route proceeds |

**Key functions:**

- `submitOrder(InEuint128 encAmount, InEbool encIsBuy)` — adds encrypted order to the current batch
- `postBatchPrice(uint32 batch, uint256 buyPrice, uint256 sellPrice)` — keeper posts WAD prices computed from decrypted reserves
- `injectNoise(InEuint128 encNoise)` — keeper injects one random encrypted amount per batch; symmetric addition masks aggregate totals
- `executeBatch(uint32 batch)` — permissionless; requires price posted and `batchSize` blocks elapsed; runs FHE arithmetic over all orders then updates encrypted reserves
- `claimOutput(uint32 batch)` — triggers `FHE.decrypt` on the user's pending encrypted output; user polls `getDecryptedShares` until result is ready
- `addLiquidity(uint256 amount0, uint256 amount1)` — plaintext deposit, immediately encrypted into reserves
- `requestDecryptReserves()` / `getDecryptedReserves()` — keeper async decrypt flow

**Batch execution math (all FHE):**

```
for each order:
    buyOut  = FHE.div(FHE.mul(amount, encBuyPrice), encWad)
    sellOut = FHE.div(FHE.mul(amount, encSellPrice), encWad)
    out     = FHE.select(isBuy, buyOut, sellOut)
    netBuy  += FHE.select(isBuy, amount, ZERO)
    netSell += FHE.select(isBuy, ZERO, amount)
    pendingOut[owner] += out

netBuy  += noise   // symmetric — cancels in reserve delta
netSell += noise

reserve0 = reserve0 + netBuy - netSell
reserve1 = reserve1 + netSell - netBuy
```

### FugaziFactory

Minimal factory: deploys pools and indexes them by sorted `(token0, token1)` pair.

```solidity
function createPool(address tokenA, address tokenB, uint32 batchSize) external returns (address);
function getPool(address tokenA, address tokenB) external view returns (address);
```

### FugaziRouter

User-facing entry point. Handles token sorting and routes calls to the correct pool.

```solidity
function submitOrder(address tokenIn, address tokenOut, InEuint128 encAmount, InEbool encIsBuy) external;
function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external;
function claimOutput(address tokenA, address tokenB, uint32 batch) external;
```

---

## Setup

### Prerequisites

- Node.js 20+
- A funded Sepolia wallet (for gas)
- MetaMask or any EIP-1193 browser wallet

### Contracts

```bash
cd contracts
cp .env.example .env
# fill in PRIVATE_KEY and SEPOLIA_RPC_URL
npm install

# run tests (requires local cofhe mock — uses hardhat network)
npm test

# deploy to Sepolia
npm run deploy:sepolia

# run keeper manually (post price + inject noise for current batch)
POOL_ADDRESS=0x0cE1B1364fCf25D8Fa486347e68658C7701f8c6d \
  npx hardhat run scripts/price-keeper.ts --network eth-sepolia
```

### Frontend

```bash
cd area51
cp .env.local.example .env.local   # or create manually
# required vars:
# NEXT_PUBLIC_POOL_ADDRESS
# NEXT_PUBLIC_ROUTER_ADDRESS
# NEXT_PUBLIC_FACTORY_ADDRESS
# NEXT_PUBLIC_TOKEN_A
# NEXT_PUBLIC_TOKEN_B
# FHENIX_RPC_URL
# KEEPER_PRIVATE_KEY   (for /api/keeper route)

npm install
npm run dev
# open http://localhost:3000
```

---

## Environment Variables

### `contracts/.env`

| Variable | Description |
|---|---|
| `PRIVATE_KEY` | Deployer / keeper EOA private key |
| `SEPOLIA_RPC_URL` | Ethereum Sepolia JSON-RPC endpoint |
| `ARB_SEPOLIA_RPC_URL` | Arbitrum Sepolia endpoint (optional) |

### `area51/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_POOL_ADDRESS` | Deployed FugaziPool address |
| `NEXT_PUBLIC_ROUTER_ADDRESS` | Deployed FugaziRouter address |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed FugaziFactory address |
| `NEXT_PUBLIC_TOKEN_A` | FZA token address |
| `NEXT_PUBLIC_TOKEN_B` | FZB token address |
| `FHENIX_RPC_URL` | RPC used by server-side API routes |
| `KEEPER_PRIVATE_KEY` | Signs keeper transactions from `/api/keeper` |

---

## Price Keeper

The keeper is the only privileged actor in the system. It holds the `keeper` role on each pool and is responsible for:

1. Calling `requestDecryptReserves()` to trigger the CoFHE async decrypt
2. Polling `getDecryptedReserves()` until both reserves are available
3. Computing `buyPrice = (r1 * 1e18) / r0` and `sellPrice = (r0 * 1e18) / r1` as BigInt
4. Posting prices on-chain via `postBatchPrice()`
5. Generating a random noise amount and submitting it encrypted via `injectNoise()`

The keeper can be run as a standalone Hardhat script or triggered via the `/api/keeper` Next.js route handler (suitable for cron invocation).

**Standalone:**
```bash
POOL_ADDRESS=<pool> npx hardhat run scripts/price-keeper.ts --network eth-sepolia
```

**Via API (cron-compatible):**
```bash
curl -X POST https://your-app.vercel.app/api/keeper
```

The keeper does not have access to individual order data — it only sees the aggregate encrypted reserves after batch execution. The noise it injects is chosen randomly in the range `[1e18, 100e18]` (1–100 tokens) each round.

---

## Tech Stack

| Layer | Stack |
|---|---|
| FHE | Fhenix CoFHE, `@fhenixprotocol/cofhe-contracts`, `cofhejs` |
| Contracts | Solidity 0.8.25, Hardhat 2.22.19, OpenZeppelin 5 |
| Chain | Ethereum Sepolia (also compatible with Fhenix Nitrogen, Arbitrum Sepolia) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4 |
| Wallet | `@metamask/connect-evm` (EIP-1193), wagmi v2, viem v2 |
| 3D / Canvas | Three.js, `@react-three/fiber`, `@react-three/drei`, UnrealBloom post-processing |
| On-chain reads | ethers v6 (server-side API routes) |

---

## Testing

```bash
cd contracts
npm test
```

13 test cases covering:

- Order submission — `orderCount` increments, amount stays as opaque ciphertext
- Batch execution — reserves change correctly after a buy/sell round
- Noise injection — duplicate injection reverts; noise masks aggregate totals
- Minimum output enforcement — orders below `minOut` result in zero `_pendingOut`
- LP add / remove — encrypted `totalShares` tracks correctly
- Gate conditions — `executeBatch` reverts without posted price; reverts before `batchSize` blocks

Tests run against the `cofhe-hardhat-plugin` mock network (no Docker or external coprocessor required).

---

## License

CC0
