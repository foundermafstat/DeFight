# DeFight: Autonomous Trading Agent Arena

**Status**: MVP / Alpha  
**Network**: Bitcoin Cash (BCH) Chipnet  
**Architecture**: Event-Driven Monorepo (Node.js + Next.js + CashTokens)

DeFight is a decentralized platform where user-defined AI agents trade crypto assets in real-time, competing in PvP tournaments or solo runs. The system features a unique **Execution Engine** that deterministically simulates exchange orders from LLM outputs, a **Game Master** orchestrator that manages high-frequency loops, and a fully on-chain **Marketplace and Tournament System** anchored on the Bitcoin Cash blockchain using CashTokens.

**Verified Smart Contracts (Chipnet)**:
- Oracle Wallet Address: `bchtest:qph70sq2j744hgkes7dlxcydtgann6vdxclwgzrdre`
- Market Contract (Template): `bchtest:pvl3777jjmjlhpjzdephc9f64pfhnt4fdt3mgaphjlx4796l8znhkcmhwknrx`
- Tournament Contract (Template): `bchtest:pvn7x6kc2rm8a6smmlpyewp85tese0t78tcep7mmlyxjlmsc6jsqv3u65hdal`

---

## 📚 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Project Structure Breakdown](#-project-structure-breakdown)
3. [Deep Dive: Smart Contracts & CashTokens](#-deep-dive-smart-contracts--cashtokens)
4. [Deep Dive: GameMaster (Server)](#-deep-dive-gamemaster-server)
5. [Deep Dive: Execution Engine](#-deep-dive-execution-engine)
6. [The PvP Tournament System](#-the-pvp-tournament-system)
7. [Data & Persistence Layer](#-data--persistence-layer)
8. [Installation & Setup](#-installation--setup)

---

## 🏛 Architecture Overview

The platform uses a **Server-Side Proxy Architecture** coupled with **On-Chain Settlement** to ensure fairness, security, and deterministic execution. Clients (browsers) do not execute trades or call LLMs directly; instead, they submit strategies and view state updates streamed via WebSockets. Value transfer and ownership are secured by CashToken covenants.

### High-Level Data Flow

1. **Strategy Submission**: User writes a prompt (e.g., "Buy on RSI < 30") and uses their Web3 wallet connected to Chipnet.
2. **Orchestration**: The **GameMaster** (Node.js) starts a `RunSession`.
3. **Market Tick**: Every 30s (configurable), the server fetches a snapshot from Binance (Public API).
4. **AI Decision**: The **Engine** constructs a system prompt with the market snapshot + user strategy and queries OpenAI.
5. **Execution Simulation**: The LLM's JSON response is validated by the **Middleman**, which converts it into an "Exchange Call" and executes a virtual trade.
6. **State Broadcast**: `Live Logs`, `Portfolio`, and `PnL` are emitted via Socket.io to the Frontend.
7. **Consensus & Minting**: The agent's final PnL is anchored on-chain by minting a **CashToken NFT** that stores the AI's generation, ROI, and performance metadata.

---

## 📂 Project Structure Breakdown

The codebase is a **Turborepo** monorepo containing three primary layers:

```text
DeFight/
├── apps/
│   └── web/                 # [Frontend] Next.js app. Dashboard, IDE, Marketplace, and Visualization.
├── packages/
│   ├── gamemaster/          # [Backend] The central nervous system. Express API + Socket.io + CashScript integration.
│   │   └── contracts/       # [Web3] CashScript smart contracts (.cash files + compiled JSON artifacts).
│   ├── engine/              # [Logic] Pure logic package for prompt building and order routing.
│   └── sdk/                 # [Shared] Types and Contract ABIs/Interfaces.
├── docs/                    # [Documentation] Architecture Deep Dives.
└── scripts/                 # Utility scripts for wallet generation and deployment.
```

---

## ⛓️ Deep Dive: Smart Contracts & CashTokens

**Path**: `packages/gamemaster/contracts/`

DeFight leverages Bitcoin Cash's **CashTokens** upgrade and **CashScript** covenants to enable a serverless, non-custodial economy around the AI agents. Agents are represented as NFTs, allowing users to buy, sell, and stake them natively on-chain.

### 1. `dft_nft_token.cash` (GenerativeBotNFT)
This contract serves as a global registry for non-transferable (Soulbound) AI bots. 
- **Mutable Token Commitments**: Ownership and trading are implemented entirely by mutating the 40-byte NFT state commitment (`[20-byte owner PKH][8-byte price][12-byte bot hash]`).
- **Built-in Marketplace**: Instead of relying on a centralized escrow, the NFT contains a `buy()` function allowing any user to atomic-swap the required BCH directly to the current owner to claim the NFT.
- **Slippage Protection**: The buyer must define a maximum price limit to prevent front-running price updates.

### 2. `dft_market.cash` (Marketplace)
A decentralized escrow covenant for listing regular bots on the open market.
- **Function `buy()`**: Enforces that the transaction transfers the exact `price` in satoshis to the `sellerPkh`, whilst simultaneously forwarding the locked NFT to the buyer.
- **Function `cancel()`**: Allows the original seller to retrieve their NFT back to their wallet at any time, granted they provide a valid cryptographic signature.

### 3. `dft_tournament.cash` (Tournament Escrow)
Secures the PvP arena stakes. Players lock their NFTs and a specific amount of BCH into this contract.
- **Function `resolveTournament()`**: Only the GameMaster (acting as an Oracle) can sign the resolution transaction. It automatically routes the total prize pool minus the platform fee (in basis points) to the `winnerPkh`.
- **Refund mechanism**: If an error occurs, the funds can be refunded through a multi-sig consensus between the player and the GameMaster.

---

## 🧠 Deep Dive: GameMaster (Server)

**Path**: `packages/gamemaster/src/`

The `GameMaster` is the core backend service. It is designed to be **stateless** regarding game logic (delegating to the `engine`) but **stateful** regarding active sessions and socket connections.

### Core Components (`src/services/`)

#### 1. `TradingOrchestrator.ts`
The heart of the simulation. It manages the lifecycle of a trading run:
- **`runSession()`**: Executes a full loop of `N` cycles.
- **`runStep()`**: Executes a single tick. (Fetches Market Data -> Calls AI -> Parses Signal -> Applies Virtual Trade).

#### 2. `TournamentService.ts`
Manages 1v1 PvP Battles. Guarantees both agents receive the **exact same market snapshot** at the identical millisecond to ensure absolute fairness.

#### 3. `BchService.ts` & `FilebaseService.ts`
Handles all direct blockchain interactions. 
- Automatically generates SVG charts representing the agent's performance.
- Uploads the charts and NFT metadata to decentralized IPFS storage via Filebase.
- Mints the actual CashToken transactions broadcasting them to the BCH Chipnet network using `mainnet-js`.

#### 4. `LeaderboardService.ts` & `SupabaseAccountModelsStore.ts`
Abstracts the storage layer. Syncs detailed history to a Postgres DB for analytics, tracking aggregate PnL, ROI, win rates, and evolution histories.

---

## ⚙️ Deep Dive: Execution Engine

**Path**: `packages/engine/src/`

The `engine` is a pure TypeScript package isolating LLM interactions.

#### `middleman.ts`
Translator between LLMs and Exchange APIs. Validates the required JSON outputs using strict Zod schemas.

#### `systemPrompt.ts`
Contains the "God Prompt" fed to the agent.
```json
{"action":"BUY|SELL|HOLD", "asset":"BCH", "amount_pct":10, "reason":"..."}
```

---

## ⚔️ The PvP Tournament System

1. **Matchmaking**: Players submit their `modelId` and verify their on-chain Escrow Transaction (`txId`).
2. **The Tick**: Determinism is ensured by feeding the exact same timestamp/price.
3. **Winning Condition**: Highest PnL at `t=End` wins.
4. **Resolution**: The GameMaster backend automatically generates the payload to unlock the `dft_tournament.cash` contract, sending the prize pool to the victor's wallet.

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 18+
- Supabase Project (Database)
- OpenAI API Key
- Filebase API Key (for IPFS pinning)

### 1. Install Dependencies

```bash
npm install
npm --prefix packages/gamemaster/contracts install
```

### 2. Environment Configuration

Copy the examples to create your local env files:

```bash
cp .env.example .env
cp packages/gamemaster/.env.example packages/gamemaster/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### 3. Run the Development Server

```bash
npm run dev
```

- **Web**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 🔮 Roadmap & Vision

**Goal**: Create the ultimate "Colosseum" for AI Trading Agents on Bitcoin Cash.

- [x] **MVP**: Solo runs, simple moving average strategies, manual PvP.
- [x] **Web3 Integration**: Chipnet wallet login, Leaderboard, CashToken Minting.
- [x] **P2P Marketplace**: Trustless trading of soulbound/transferable Agent NFTs via smart contracts.
- [ ] **Automated Matchmaking**: Queue system for continuous PvP.
- [ ] **Staking**: Players stake CashTokens to empower agents; winners generate yield.
- [ ] **Visual Backtesting**: Replay historical market data to test prompts instantly.
