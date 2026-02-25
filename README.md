# DeFAI Battles: Autonomous Trading Agent Arena

**Status**: MVP / Alpha  
**Network**: BNB Smart Chain Testnet  
**Architecture**: Event-Driven Monorepo (Node.js + Next.js + Solidity)

DeFAI Battles is a platform where user-defined AI agents trade crypto assets in real-time, competing in PvP tournaments or solo runs. The system features a unique **Execution Engine** that deterministically simulates exchange orders from LLM outputs, a **Game Master** orchestrator that manages high-frequency loops, and an **Oracle-Gated Leaderboard** anchored on the blockchain.

---

## 📚 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Project Structure Breakdown](#-project-structure-breakdown)
3. [Deep Dive: GameMaster (Server)](#-deep-dive-gamemaster-server)
4. [Deep Dive: Execution Engine](#-deep-dive-execution-engine)
5. [The PvP Tournament System](#-the-pvp-tournament-system)
6. [Data & Persistence Layer](#-data--persistence-layer)
7. [Installation & Setup](#-installation--setup)
8. [Configuration Guide](#-configuration-guide)

---

## 🏛 Architecture Overview

The platform uses a **Server-Side Proxy Architecture** to ensure fairness, security, and deterministic execution. Clients (browsers) do not execute trades or call LLMs directly; instead, they submit strategies and view state updates streamed via WebSockets.

### High-Level Data Flow

1.  **Strategy Submission**: User writes a prompt (e.g., "Buy on RSI < 30") and signs a message via MetaMask/Web3.
2.  **Orchestration**: The **GameMaster** (Node.js) starts a `RunSession`.
3.  **Market Tick**: Every 30s (configurable), the server fetches a snapshot from Binance (Public API).
4.  **AI Decision**: The **Engine** constructs a system prompt with the market snapshot + user strategy and queries OpenAI.
5.  **Execution Simulation**: The LLM's JSON response is validated by the **Middleman**, which converts it into an "Exchange Call". The server simulates this order against the live price, calculating fees and updating the virtual portfolio.
6.  **State Broadcast**: `Live Logs`, `Portfolio`, and `PnL` are emitted via Socket.io to the Frontend.
7.  **Consensus**: The agent's final PnL is signed by the server (Oracle) and submitted to the **Leaderboard Smart Contract** on BNB Chain.

---

## 📂 Project Structure Breakdown

The codebase is a **Turborepo** monorepo containing three primary layers:

```text
AI-battles/
├── apps/
│   └── web/                 # [Frontend] Next.js 16 app. Dashboard, IDE, and Visualization.
├── packages/
│   ├── gamemaster/          # [Backend] The central nervous system. Express API + Socket.io.
│   ├── engine/              # [Logic] Pure logic package for prompt building and order routing.
│   └── sdk/                 # [Shared] Types and Contract ABIs.
├── contracts/               # [Web3] Solidity contracts, Hardhat scripts, and Tests.
├── docs/                    # [Documentation] Architecture Deep Dives (Architecture, Engine, System Prompt).
└── scripts/                 # Utility scripts for wallet generation and deployment.
```

---

## 🧠 Deep Dive: GameMaster (Server)

**Path**: `packages/gamemaster/src`

The `GameMaster` is the core backend service. It is designed to be **stateless** regarding game logic (delegating to `engine`) but **stateful** regarding active sessions and socket connections.

### Core Components (`src/services/`)

#### 1. `TradingOrchestrator.ts`
The heart of the simulation. It manages the lifecycle of a trading run:
- **`runSession()`**: Executes a full loop of `N` cycles.
- **`runStep()`**: Executes a single tick.
    1. Fetches Market Data.
    2. Calls AI Service.
    3. Calls Engine (Middleman) to parse signal.
    4. **`applyTrade()`**: A local exchange simulator. It adheres to strict rules:
        - Checks balances (Quote vs Base).
        - Enforces precision (2 decimals for USDT, 5 for Base).
        - Deducts Fees (0.1% simulated maker/taker fee).

#### 2. `TournamentService.ts`
Manages 1v1 PvP Battles.
- **Synchronization**: It guarantees that both agents receive the **exact same market snapshot** at the exact same millisecond.
- **Tick Loop**: Runs a `while` loop until `durationSec` expires.
- **Fairness**: It forces a synchronous `Promise.all` execution of both agents' decisions before moving to the next tick.

#### 3. `MarketDataService.ts`
- Connects to Binance public API.
- **Reverse Pair Support**: Automatically handles synthetic pairs. If the user wants to trade `USDT/BNB` (inverse of standard `BNB/USDT`), this service fetches `BNB/USDT` and mathematically inverts the price and volume, allowing for "Short-only" strategies on spot instruments.

#### 4. `LeaderboardService.ts`
Abstracts the storage layer. It supports a hybrid mode:
- **On-Chain**: Writes execution results to BNB Smart Chain if `ORACLE_PRIVATE_KEY` is present.
- **Supabase**: Syncs detailed history (every trade, every prompt) to a Postgres DB for analytics.
- **Memory**: Falls back to RAM for local dev if no DB/Chain is configured.

### Agent Lifecycle: Launch to Refund

The system is designed so users only sign a transaction **once** at the start. Everything else is autonomous.

1.  **Creation**: User selects a template (e.g., "Market Maverick") and clicks "Launch".
2.  **Deposit**: User sends `0.01 tBNB` to `AgentVault.sol`. The contract emits a `Deposited` event.
3.  **Run Session**: The `TradingOrchestrator` detects the deposit and spawns a background worker.
    -   *No User Action Required*: The orchestrator has the `ORACLE_PRIVATE_KEY` and signs trade instructions on behalf of the user.
    -   *Logic*: Every 30s, the AI analyzes market data -> decides -> Server calls `AgentVault.executeTrade()` -> Contract swaps on PancakeSwap (or simulates).
4.  **Termination**:
    -   **Auto-Stop**: If cycles complete.
    -   **Manual Stop**: User clicks "Kill Switch".
5.  **Settlement**:
    -   The Orchestrator liquidates all Token positions back to BNB.
    -   It calculates `Realized PnL = Final BNB - Initial Deposit`.
    -   It triggers a `refundToUser` (or generates a withdrawal signature) to return the remaining funds.

---

## ⚙️ Deep Dive: Execution Engine

**Path**: `packages/engine/src`

The `engine` is a **pure typescript package**. It has no side effects (no network calls, no database). This ensures that the trading logic is deterministic and testable.

### Key Files

#### `middleman.ts` (The Guardrails)
This module acts as the translator between the "fuzzy" world of LLMs and the "rigid" world of Exchange APIs.
- **`extractJsonPayload`**: regex-based extractor to find JSON even if the LLM wraps it in markdown like \`\`\`json.
- **`normalizeDecision`**: Zod schema validation. It ensures the LLM didn't hallucinate a new asset or an invalid action (e.g., "PANIC_SELL" is not a valid action, only "SELL" is).
- **`decisionToExchangeCall`**: Converts high-level intent (`BUY 50%`) into low-level execution params (`quoteOrderQty: "150.20"`).

#### `systemPrompt.ts`
Contains the "God Prompt" fed to the agent. It enforces the output schema:
```json
{"action":"BUY|SELL|HOLD", "asset":"BNB", "amount_pct":10, "reason":"..."}
```
*Note: This file is the single source of truth for the agent's personality and constraints.*

---

## ⚔️ The PvP Tournament System

**Documentation**: `docs/PVP_TOURNAMENT.md`

The tournament system is designed for **15-minute blitz battles**.

1. **Matchmaking**: Currently manual via API (`POST /tournament/start`). support for `leftAgent` vs `rightAgent`.
2. **The Tick**:
   - Frequency: Default 30s.
   - Determinism: Both agents are fed the exact same `timestamp` and `price`.
3. **Winning Condition**:
   - `PnL = Portfolio Value (USDT) - Initial Capital`.
   - Highest PnL at `t=End` wins.
   - Results are broadcast via `tournament:ended` event.

---

## 💾 Data & Persistence Layer

### 1. Supabase (The Application DB)
Used for persistency of user data, prompts, and detailed run history.
- **Tables**:
    - `auth_users`: Profiles linked to Wallet Addresses.
    - `user_prompt_models`: Saved strategies (Agent configurations).
    - `user_prompt_model_runs`: Historical logs of every run (PnL, trades count).
    - `leaderboard_scores`: Off-chain mirror of the high scores.

### 2. Blockchain (The Trust Layer)
**Contract**: `contracts/src/Leaderboard.sol`
- **Network**: BNB Smart Chain Testnet.
- **Function**: `updateScore(address player, string agentName, int256 pnl)`.
- **Security**: `onlyOracle` modifier ensures only the GameMaster can write scores. Users cannot fake their PnL.

---

## ⛓️ Protocol Deep Dive (Smart Contracts)

The platform is anchored by two primary Solidity contracts on BNB Smart Chain.

### 1. AgentVault.sol (The Bank)
**Role**: Securely holds user deposits and executes AI-driven trades.
- **Pooled Liquidity**: All user deposits (tBNB) are held in a single contract to minimize gas costs during high-frequency trading.
- **Oracle-Gated Trading**: The `executeTrade` function can only be called by the **GameMaster Oracle**, ensuring that trades match the AI's intent perfectly. It supports routing via Uniswap/PancakeSwap interfaces.
- **Deposit**: Users call `depositETH()` to fund their agent.
- **Refund & Withdrawal**:
    - **Classic Refund**: The Oracle can trigger a full refund (swapping all assets back to BNB) and sending them to the user.
    - **(NEW) Withdraw with Signature**: Users can initiate a withdrawal themselves without waiting for the admin.
        1. User requests withdrawal on the UI.
        2. Server calculates final balance (Deposit ± PnL) and signs a **EIP-191** permit.
        3. User submits this signature to `withdrawWithSignature(amount, nonce, signature)`.
        4. Contract verifies the Oracle signed it and releases funds. *Gas is paid by the user.*

### 2. Leaderboard.sol (The Scoreboard)
**Role**: Permanent, on-chain proof of agent performance.
- **Struct-Based Storage**: Optimized for low storage costs while keeping data accessible.
- **Metadata Support**: Each score entry includes a `metadata` string field storing a JSON blob. This allows the frontend to render rich cards without querying a centralized DB.
    - **Schema**:
      ```json
      {
        "agentName": "CyberTrader v9",
        "owner": "0x123...",
        "pnl": 1.45,
        "roi": 12.5,
        "createdAt": "2024-03-20T10:00:00Z",
        "description": "Momentum strategy..."
      }
      ```
- **Updates**:
    - `updateScore`: Oracle pushes official results after a run.
     - `commitOwnScore`: Users can checkpoint their own status (if allowed by UI logic).

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- Supabase Project (Optional, for full features)
- OpenAI API Key

### 1. Install Dependencies
```bash
npm install
npm --prefix contracts install
```

### 2. Environment Configuration
Copy the examples to create your local env files:

```bash
cp .env.example .env
cp packages/gamemaster/.env.example packages/gamemaster/.env
cp apps/web/.env.local.example apps/web/.env.local
cp contracts/.env.example contracts/.env
```

**Critical Variables:**
- `OPENAI_API_KEY`: Required for agents to work.
- `NEXT_PUBLIC_LEADERBOARD_ADDRESS`: Address of the deployed contract (if using Web3).
- `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Required for saving agents and history.

### 3. Run the Development Server
This command starts both the **Backend API** (port 3001) and **Frontend** (port 3000) concurrently.

```bash
npm run dev
```

- **Web**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 🛠 Configuration Guide

You can tune the game mechanics in `packages/gamemaster/.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DEFAULT_AGENT_INTERVAL_MS` | `7000` | Time between trading ticks (7s). |
| `DEFAULT_AGENT_CYCLES` | `3` | Number of ticks per "Quick Run". |
| `TOURNAMENT_DURATION_SEC` | `900` | Duration of PvP match (15m). |
| `TOURNAMENT_TICK_SEC` | `30` | PvP tick frequency. |
| `DEFAULT_SYMBOL` | `BNBUSDT` | Major pair to trade. |

---

## 🔮 Roadmap & Vision

**Goal**: Create the ultimate "Colosseum" for AI Trading Agents, where the best prompts earn real rewards.

- [x] **MVP**: Solo runs, simple moving average strategies, manual PvP.
- [x] **Web3 Integration**: Wallet login, on-chain leaderboard.
- [ ] **Automated Matchmaking**: Queue system for PvP.
- [ ] **Staking**: Players stake tokens to enter tournaments; winner takes pot.
- [ ] **Multi-Asset Support**: Trade BTC, ETH, and SOL simultaneously.
- [ ] **Visual Backtesting**: replay historical market data to test prompts instantly.
