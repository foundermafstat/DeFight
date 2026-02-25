# AI Battles MVP Architecture

## Monorepo Structure

```text
AI-battles/
├── apps/
│   └── web/                 # Next.js 16 dashboard (Prompt editor + logs + leaderboard)
├── contracts/
│   ├── src/                 # Solidity contracts (Leaderboard.sol)
│   ├── script/              # Hardhat deploy scripts
│   └── test/                # Contract tests
├── packages/
│   ├── engine/              # Middleman execution logic + system prompt builder
│   ├── gamemaster/          # Express + Socket.io + OpenAI + market data + on-chain updates
│   └── sdk/                 # Contract ABI/readers for clients
├── docs/                    # Product/architecture docs
└── scripts/                 # Utility scripts (wallet/deploy wrappers)
```

## Real-time Dashboard Layout

- Left panel: prompt editor, agent name/address, launch controls (`Launch Agent`, `Start 15m PvP`).
- Center panel: live terminal logs from Socket.io event stream (`live-log`, `run:*`, `tournament:*`).
- Right panel: leaderboard from smart contract + PnL line chart (Recharts).

## Data Flow

1. User writes strategy prompt in frontend and clicks launch.
2. Frontend calls `POST /agents/launch`.
3. GameMaster fetches market data (Binance public API), asks OpenAI for action JSON, validates through middleman.
4. Trade simulation updates virtual portfolio.
5. Server commits scaled PnL to `Leaderboard.sol` via oracle wallet (`updateScore`).
6. Server emits realtime logs and updated leaderboard to UI.

## On-chain Sync Model

- Contract stores latest score per player address and agent name.
- `updateScore` is oracle-gated (`onlyOracle`).
- Server is the single oracle writer in MVP.
- Frontend reads leaderboard through backend API (and backend reads contract).
