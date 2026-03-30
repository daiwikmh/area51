# area51 — FHE Dark Pool DEX on Fhenix

## Context

Build a privacy-preserving AMM-based DEX ("area51") on Fhenix FHE blockchain. Individual order sizes and directions are hidden via fully homomorphic encryption. The system batches trades and injects protocol-owned noise orders so an attacker sees only the aggregate (trader + noise), never individual order data. Pool reserves are also encrypted. No oracle or centralized operator is required for trading — only for price-posting (see keeper below). This is implemented as a Hardhat + Solidity project inside the existing Next.js 16 app at `/home/daiwi/phe/area51/`.

---

## Architecture Overview

Three layers:
1. **Solidity contracts** — FHE state, encrypted reserves, batch order queue, noise injection, LP shares
2. **Price keeper** — off-chain Node.js script that unseals reserves via permit, computes `price = r1/r0` in plaintext BigInt, posts signed price on-chain (solves the no-encrypted-division constraint)
3. **Frontend** — Next.js 16 app with `@cofhe/react` + wagmi for encrypted order submission

---

## Critical Constraint: No Encrypted Division

Fhenix FHE supports `FHE.mul(euint128, plaintext)` but NOT `FHE.div(euint128, euint128)`. This affects:
- **AMM price**: Solved by keeper posting `price = r1/r0` as Q128.128 plaintext; contract does `dy = FHE.mul(dx, price)`
- **LP share proportions**: Solved by keeper-assisted withdrawal: keeper seals user shares + total shares, user decrypts off-chain, submits plaintext ratio with keeper signature

---

## Phase 1 — Contracts [DONE]

Contracts live in a separate project at `/home/daiwi/phe/contracts/` (sibling to `area51/`).

Uses **CoFHE** SDK (not legacy fhenix-contracts):
- `@fhenixprotocol/cofhe-contracts` for Solidity FHE library
- `cofhe-hardhat-plugin` for local mock testing
- `cofhejs` for client-side encrypt/decrypt
- Solidity 0.8.25, evmVersion cancun, Hardhat 2.22.19

### Files Created

```
contracts/
├── contracts/
│   ├── area51Pool.sol
│   ├── area51Factory.sol
│   ├── area51Router.sol
│   ├── MockERC20.sol
│   └── interfaces/
│       ├── Iarea51Pool.sol
│       └── Iarea51Router.sol
├── scripts/deploy.ts
├── test/
│   ├── area51Pool.test.ts
│   └── helpers/fhe.ts
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```

### CoFHE API Changes vs Original Plan

Key differences from the original plan (which assumed legacy `fhenix-contracts`):
- Import: `@fhenixprotocol/cofhe-contracts/FHE.sol` (not `@fhenixprotocol/contracts`)
- Input types: `InEuint128`, `InEbool` (capital I, structs) not `inEuint128`
- Access control: `FHE.allowThis()`, `FHE.allowSender()`, `FHE.allow(val, addr)`
- Decrypt: `FHE.decrypt(val)` + `FHE.getDecryptResultSafe(val)` (async, not permit sealing)
- Select: `FHE.select(ebool, euint128, euint128)` typed overloads exist
- Price: keeper posts `buyPrice` + `sellPrice` as WAD (1e18) precision uint256 (not Q128.128)
- Local testing: `cofhe-hardhat-plugin` deploys mock CoFHE contracts on hardhat network
- `FHE.div(euintN, euintN)` is available in CoFHE (used for price math)

### `area51Pool.sol` — Core Contract

**Storage layout:**

| Field | Type | Visibility |
|---|---|---|
| `_reserve0`, `_reserve1` | `euint128` | Encrypted — keeper decrypts for price |
| `_lpShares[user]` | `euint128` | Encrypted — user decrypts via request |
| `_totalShares` | `euint128` | Encrypted |
| `order.amount` | `euint128` | Encrypted — never revealed |
| `order.isBuy` | `ebool` | Encrypted — never revealed |
| `order.owner` | `address` | Public — needed to route proceeds |
| `_batchNoise[batch]` | `euint128` | Encrypted — symmetrically cancels out |
| `batchBuyPrice[batch]` | `uint256` WAD | Public — keeper posts it |
| `batchSellPrice[batch]` | `uint256` WAD | Public — keeper posts it |
| `batchExecuted[batch]` | `bool` | Public |
| `_pendingOut[batch][user]` | `euint128` | Encrypted — user decrypts after claim |

**Key functions:**

- `submitOrder(InEuint128 encAmount, InEbool encIsBuy)` — adds encrypted order to current batch
- `injectNoise(InEuint128 encNoise)` — keeper injects random encrypted noise once per batch
- `postBatchPrice(uint32 batch, uint256 buyPrice, uint256 sellPrice)` — keeper posts WAD prices
- `executeBatch(uint32 batch)` — permissionless; iterates orders via `_processOrder`, adds noise, updates reserves
- `claimOutput(uint32 batch)` — triggers `FHE.decrypt` on user pending output
- `addLiquidity(uint256 amount0, uint256 amount1)` — plaintext deposit, encrypts into reserves
- `requestDecryptReserves()` / `getDecryptedReserves()` — keeper async decrypt flow
- `requestDecryptShares()` / `getDecryptedShares(address)` — user async decrypt flow

**Batch execution flow (refactored into _processOrder + _accumulateFlows + _finalizeReserves):**
```
for each order in batch:
    buyOut  = FHE.div(FHE.mul(amount, encBuyPrice), encWad)
    sellOut = FHE.div(FHE.mul(amount, encSellPrice), encWad)
    outAmount = FHE.select(isBuy, buyOut, sellOut)
    netBuy  += FHE.select(isBuy, amount, ZERO)
    netSell += FHE.select(isBuy, ZERO, amount)
    _pendingOut[batch][owner] += outAmount

netBuy  = FHE.add(netBuy,  noise)   // masks aggregate
netSell = FHE.add(netSell, noise)   // symmetric cancellation

_reserve0 = _reserve0 + netBuy - netSell
_reserve1 = _reserve1 + netSell - netBuy
```

### `area51Factory.sol`

```solidity
mapping(address => mapping(address => address)) public getPool;
function createPool(address tokenA, address tokenB, uint32 batchSize) external returns (address);
```

### `area51Router.sol`

User-facing entry point. Routes to correct pool by (tokenIn, tokenOut).

---

## Phase 2 — Price Keeper Script

### `scripts/price-keeper.ts`

```typescript
// 1. Generate permit keypair via cofhejs
// 2. Call pool.sealedReserve0(pubKey) and pool.sealedReserve1(pubKey)
// 3. Decrypt sealed values with permit private key (off-chain, client-side FHE)
// 4. price = (r1 * 2n**128n) / r0  — BigInt, not FHE
// 5. Sign keccak256(batch, price, poolAddress) with keeper EOA
// 6. Call pool.postBatchPrice(batch, price, sig)
// 7. Optionally call injectNoise(encNoise) for the next batch
```

Also exposed as `app/api/keeper/route.ts` (Next.js Route Handler) for cron invocation.

---

## Phase 3 — Frontend

### New Packages Needed

```json
{
  "dependencies": {
    "cofhejs": "^0.3.0",
    "@cofhe/react": "^0.3.0",
    "wagmi": "^2.12.0",
    "viem": "^2.20.0",
    "@tanstack/react-query": "^5.59.0"
  },
  "devDependencies": {
    "hardhat": "^2.22.0",
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@nomicfoundation/hardhat-ignition-ethers": "^0.15.0",
    "hardhat-fhenix": "^0.5.0",
    "@cofhe/sdk": "^0.3.0",
    "ethers": "^6.13.0"
  }
}
```

### New Files

```
app/
├── providers.tsx          'use client' — FheProvider + WagmiProvider + QueryClientProvider
├── swap/page.tsx          Server Component shell — renders SwapForm
├── pool/page.tsx          Server Component shell — renders LiquidityForm
├── batches/page.tsx       Public batch history (order counts, prices, execution status)
├── api/keeper/route.ts    POST endpoint — triggers price-keeper logic server-side
└── components/
    ├── SwapForm.tsx        'use client' — encrypts amount via fhevm.encrypt128, submits order
    ├── LiquidityForm.tsx   'use client' — add/remove LP tabs
    ├── BatchQueue.tsx      'use client' — live batch countdown + Execute button
    ├── ReserveDisplay.tsx  'use client' — seals reserves for connected keeper wallet
    └── ConnectWallet.tsx   'use client' — wagmi wallet button

lib/
├── wagmi.ts               Fhenix Nitrogen chain config (chainId 8008148)
├── contracts.ts           ABI + deployed address constants
├── fhe.ts                 cofhejs init, encrypt/decrypt helpers
└── types.ts               Shared TypeScript types
```

**Key changes to existing files:**
- `app/layout.tsx` — import and wrap children with `<Providers>` from `./providers`
- `app/page.tsx` — redirect to `/swap`

**NOTE**: Before modifying `layout.tsx` or any Next.js file, read `node_modules/next/dist/docs/` for breaking API changes (per AGENTS.md warning).

### SwapForm flow

```
user enters amount + minOut
→ fhevm.encrypt128(amount) → inEuint128 calldata
→ fhevm.encrypt128(1n)     → inEuint128 encIsBuy
→ router.submitOrder(tokenIn, tokenOut, encAmount, encIsBuy)
→ show BatchQueue with countdown
```

---

## Phase 4 — Testing

### Contract Tests (`test/area51Pool.test.ts`)

Uses `hardhat-fhenix` local node (Docker-based FHE coprocessor).

Key test cases:
- Order submission: orderCount increments, amount is opaque ciphertext
- Batch execution: seal reserves after execution, verify they changed correctly
- Noise: duplicate injection reverts; noise masks aggregate totals
- minOut enforcement: order with too-high minOut yields zero `_pendingOut`
- LP add/remove: encrypted totalShares increases/decreases proportionally
- Gate: `executeBatch` reverts without price posted first

---

## Implementation Order

1. ~~Add hardhat + FHE devDeps, hardhat config, interfaces, contracts, factory, router, tests~~ [DONE]
2. `scripts/price-keeper.ts`
3. `app/api/keeper/route.ts`
4. Frontend packages install (`cofhejs`, `wagmi`, `viem`, `@tanstack/react-query`)
5. `lib/wagmi.ts`, `lib/contracts.ts`, `lib/fhe.ts`
6. `app/providers.tsx` + update `app/layout.tsx`
7. Components: ConnectWallet → SwapForm → BatchQueue → LiquidityForm → ReserveDisplay
8. Pages: `/swap`, `/pool`, `/batches`

---

## Verification

1. ~~`npx hardhat test` — 13/13 passing against cofhe mock network~~ [DONE]
2. Deploy to testnet via `npm run deploy:sepolia` (or `npx hardhat run scripts/deploy.ts --network eth-sepolia`)
3. Run `ts-node scripts/price-keeper.ts` — verify price posts on-chain
4. `npm run dev` — connect wallet, submit swap order, watch batch queue, execute batch, claim output
5. Verify `claimOutput` returns correct token amount matching the posted price x order size

---

## Phase 5 — Dashboard UI (`/app`)

Uses the existing design system: CSS vars from `globals.css`, card classes, font-mono for numbers, no Tailwind color utilities.

### Design System Rules (non-negotiable)

- All colors via CSS vars: `--bg-surface`, `--border`, `--accent`, `--neon-cyan`, `--text-muted`, etc.
- Tailwind only for layout: `flex`, `grid`, `gap`, `p`, `w-`, `h-`
- Font: Space Grotesk (`--font-sans`) for labels, JetBrains Mono (`--font-mono`) for values/addresses/hashes
- Every panel is `'use client'`, receives typed state prop + optional `onAction` callback
- Polling lives in `Dashboard.tsx` only — 2s interval, paused when tab hidden
- No comments longer than one line, no emojis, no new CSS classes

### Mode Theming

| Mode | Accent | Use |
|---|---|---|
| `idle` | `--text-muted` | Keeper offline, no active batch |
| `live` | `--neon-cyan` | Keeper running, batch accumulating |
| `executing` | `--accent` (purple) | Batch mid-execution |
| `alert` | `--danger` | Keeper missed a batch, stale price |

### Layout (`app/app/layout.tsx` or `app/(dashboard)/layout.tsx`)

```
<div class="flex h-screen overflow-y-auto">
  <aside class="sidebar">                     220px — pool selector + nav links
  <main class="flex-1 min-w-0">
    <header class="topbar">                   sticky — pool address, keeper status badge, wallet
    <div class="p-6 space-y-4">
      <!-- stats row -->
      <div class="grid grid-cols-3 lg:grid-cols-6 gap-3">
        6x .stat-card
      <!-- main panels -->
      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-1">  SwapPanel + LiquidityPanel
        <div class="col-span-2">  BatchQueuePanel + ActivityLog
  <aside class="w-[320px] card m-3 ml-0 sticky top-3 self-start">
    ReservePanel (keeper-only sealed view)
```

### Stat Cards (6-up row)

| Label | Value | Color class | Source |
|---|---|---|---|
| BATCH | `#42` | `val-neon` | `pool.currentBatch()` |
| BLOCKS LEFT | `7` | `val-accent` | `batchEndBlock - block.number` |
| ORDERS | `12` | `val-primary` | `batchOrders[batch].length` |
| LAST PRICE | `1.0042` | `val-neon` | `batchPrice[lastBatch]` |
| NOISE | `INJECTED` / `PENDING` | `val-success` / `val-warning` | `_noiseInjected[batch]` |
| KEEPER | `LIVE` / `OFFLINE` | `val-success` / `val-danger` | keeper heartbeat API |

### Panels

**`SwapPanel.tsx`** — `'use client'`
- `.control-card` wrapper
- Token pair selector (tokenIn / tokenOut dropdowns)
- Amount input + minOut input (plain number fields, encrypted on submit)
- Direction toggle: BUY / SELL (maps to `encIsBuy`)
- `.btn-neon` Submit button — calls `onAction("submitOrder", { encAmount, encIsBuy })`
- Shows estimated output: `amount * lastPrice` (plaintext estimate, non-binding)

**`LiquidityPanel.tsx`** — `'use client'`
- `.control-card` wrapper, two tabs: ADD / REMOVE (text only, no icons)
- Add tab: two amount inputs + `.btn-start` "Add Liquidity"
- Remove tab: share amount input + keeper-ratio note + `.btn-ghost` "Request Withdrawal"
- Sealed LP balance shown via `sealedLpShares` — displays as `val-accent` mono value once decrypted

**`BatchQueuePanel.tsx`** — `'use client'`
- `.card` wrapper with `.card-inset` table inside
- Columns: `#`, `OWNER` (truncated address, font-mono), `BATCH`, `STATUS`
- Values are all encrypted — amount/direction columns show `[encrypted]` in `val-muted`
- Bottom row: block countdown progress bar + `.btn-neon` "Execute Batch" (enabled when batch ripe)
- Execute button calls `onAction("executeBatch", { batch })`

**`ActivityLog.tsx`** — `'use client'`
- `.log-card` pattern exactly
- Entry types mapped to badge classes:

| Event | Badge class | Message pattern |
|---|---|---|
| `OrderSubmitted` | `info` | `0xABCD... submitted order #5 batch 42` |
| `BatchPricePosted` | `ok` | `Batch 42 price: 1.0042` |
| `BatchExecuted` | `ok` | `Batch 42 executed — 12 orders` |
| `NoiseInjected` | `info` | `Noise injected for batch 42` |
| `NoiseOmitted` | `warn` | `Batch 42 executed without noise` |
| keeper error | `error` | `Keeper failed to post price for batch 42` |

**`ReservePanel.tsx`** — `'use client'`, right aside, keeper-only
- `.card` wrapper
- Two `.metric-card` rows: RESERVE 0 / RESERVE 1
- Shows `[sealed]` placeholder until user connects with keeper permit
- "Unseal" button calls `onAction("unsealReserves", { pubKey })` — seals via contract view, decrypts client-side
- Once unsealed: displays values in `val-neon` font-mono
- Includes current implied price `r1/r0` as `val-accent`

**Topbar status badge:**
```
idle      → status-dot idle      → "KEEPER OFFLINE"
live      → status-dot live      → "BATCH 42 — 7 BLOCKS"
executing → status-dot scanning  → "EXECUTING BATCH 42"
alert     → status-dot alert     → "STALE PRICE — BATCH 42"
```

### Files to Create (Dashboard)

```
app/
├── (dashboard)/
│   ├── layout.tsx              sidebar + topbar shell
│   ├── page.tsx                redirect to /app/swap
│   └── app/
│       ├── page.tsx            Dashboard.tsx (polling root)
│       └── components/
│           ├── Dashboard.tsx   'use client' — 2s poll, assembles all panels
│           ├── SwapPanel.tsx
│           ├── LiquidityPanel.tsx
│           ├── BatchQueuePanel.tsx
│           ├── ActivityLog.tsx
│           ├── ReservePanel.tsx
│           ├── StatRow.tsx     6-up stat cards
│           └── Topbar.tsx      status badge + wallet
lib/
└── dashboard.ts                state types: DashboardState, BatchEntry, LogEntry
```

### `DashboardState` type

```typescript
type DashboardState = {
  currentBatch: number
  blocksLeft: number
  orderCount: number
  lastPrice: bigint        // Q128.128
  noiseInjected: boolean
  keeperOnline: boolean
  batchExecuted: boolean
  log: LogEntry[]
  orders: { owner: string; batch: number; index: number }[]
}
```

### Data Flow

```
Dashboard.tsx
  useEffect 2s interval
  → fetch("/api/state")          Route Handler reads on-chain via ethers (server-side)
  → setDashboardState(data)
  → passes state down to all panels as props

onAction("submitOrder", data)
  → SwapPanel encrypts via cofhejs
  → POST /api/order { encAmount, encIsBuy }
  → Route Handler calls router.submitOrder on-chain

onAction("executeBatch", { batch })
  → POST /api/execute { batch }
  → Route Handler calls pool.executeBatch on-chain (permissionless)

onAction("unsealReserves", { pubKey })
  → POST /api/unseal { pubKey }
  → Route Handler calls pool.sealedReserve0/1, returns sealed blobs
  → client-side cofhejs decrypts with user's private key
```

---

## Phase 6 — Landing Page (`/`)

> Details to be provided. Placeholder section — will be filled in once design direction is confirmed.

---

## Full Verification (all phases)

1. `npx hardhat test` — contract tests green
2. Deploy contracts to Fhenix Nitrogen testnet
3. `ts-node scripts/price-keeper.ts` — keeper posts price on-chain
4. `npm run dev` — open `/app`, connect MetaMask to Fhenix Nitrogen
5. Submit swap order → watch BatchQueuePanel update order count
6. Wait for batch → click Execute Batch → watch ActivityLog show `BatchExecuted`
7. Claim output → verify token balance change
8. Connect as keeper → unseal reserves in ReservePanel → verify values match expected
