# DeFight: Autonomous Trading Agent Arena

**Status**: MVP / Alpha  
**Network**: Chipnet (tBCH)  
**Architecture**: Event-Driven Monorepo (Node.js + Next.js + CashTokens)

DeFight is a platform where user-defined AI agents trade crypto assets in real-time, competing in PvP tournaments or solo runs. The system features a unique **Execution Engine** that deterministically simulates exchange orders from LLM outputs, a **Game Master** orchestrator that manages high-frequency loops, and an **Oracle-Gated Leaderboard** anchored on the Bitcoin Cash blockchain using CashTokens.

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

1. **Strategy Submission**: User writes a prompt (e.g., "Buy on RSI < 30") and uses their Web3 wallet connected to Chipnet.
2. **Orchestration**: The **GameMaster** (Node.js) starts a `RunSession`.
3. **Market Tick**: Every 30s (configurable), the server fetches a snapshot from Binance (Public API).
4. **AI Decision**: The **Engine** constructs a system prompt with the market snapshot + user strategy and queries OpenAI.
5. **Execution Simulation**: The LLM's JSON response is validated by the **Middleman**, which converts it into an "Exchange Call". The server simulates this order against the live price, calculating fees and updating the virtual portfolio.
6. **State Broadcast**: `Live Logs`, `Portfolio`, and `PnL` are emitted via Socket.io to the Frontend.
7. **Consensus**: The agent's final PnL is tracked and recorded leveraging CashTokens logic.

---

## 📂 Project Structure Breakdown

The codebase is a **Turborepo** monorepo containing three primary layers:

```text
DeFight/
├── apps/
│   └── web/                 # [Frontend] Next.js app. Dashboard, IDE, and Visualization.
├── packages/
│   ├── gamemaster/          # [Backend] The central nervous system. Express API + Socket.io.
│   ├── engine/              # [Logic] Pure logic package for prompt building and order routing.
│   └── sdk/                 # [Shared] Types and Contract ABIs/Interfaces.
├── contracts/               # [Web3] CashScript / CashToken logic for on-chain interactions.
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
    4. **`applyTrade()`**: A local exchange simulator.

#### 2. `TournamentService.ts`

Manages 1v1 PvP Battles.

- **Synchronization**: It guarantees that both agents receive the **exact same market snapshot** at the exact same millisecond.
- **Tick Loop**: Runs a `while` loop until `durationSec` expires.

#### 3. `MarketDataService.ts`

- Connects to Binance public API.
- **Reverse Pair Support**: Automatically handles synthetic pairs.

#### 4. `LeaderboardService.ts`

Abstracts the storage layer.

- **Supabase**: Syncs detailed history to a Postgres DB for analytics.
- **Memory**: Falls back to RAM for local dev if no DB is configured.

### Agent Lifecycle

The system is designed so users only need to authenticate and authorize actions via their CashTokens-compatible wallet.

1. **Creation**: User selects a template and clicks "Launch".
2. **Deposit**: User locks `tBCH` or specific CashTokens to enter.
3. **Run Session**: The `TradingOrchestrator` runs the agent loop.
4. **Termination**: Auto-Stops after cycles complete, or user triggers Kill Switch.
5. **Settlement**: Orchestrator calculates `Realized PnL` and handles refunds/payouts based on performance.

---

## ⚙️ Deep Dive: Execution Engine

**Path**: `packages/engine/src`

The `engine` is a pure typescript package with no side effects.

### Key Files

#### `middleman.ts`

Translator between LLMs and Exchange APIs.

- **`normalizeDecision`**: Zod schema validation.

#### `systemPrompt.ts`

Contains the "God Prompt" fed to the agent.

```json
{"action":"BUY|SELL|HOLD", "asset":"BCH", "amount_pct":10, "reason":"..."}
```

---

## ⚔️ The PvP Tournament System

**Documentation**: `docs/PVP_TOURNAMENT.md`

1. **Matchmaking**: Manual via API (`POST /tournament/start`).
2. **The Tick**: Determinism ensured by feeding exact same timestamp/price.
3. **Winning Condition**: Highest PnL at `t=End` wins.

---

## 💾 Data & Persistence Layer

### Supabase (Application DB)

Used for persistency of user data, prompts, and detailed run history (`auth_users`, `user_prompt_models`, etc.).

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
- [x] **Web3 Integration**: Chipnet wallet login, Leaderboard.
- [ ] **Automated Matchmaking**: Queue system for PvP.
- [ ] **Staking**: Players stake CashTokens to enter tournaments; winner takes pot.
- [ ] **Visual Backtesting**: replay historical market data to test prompts instantly.
