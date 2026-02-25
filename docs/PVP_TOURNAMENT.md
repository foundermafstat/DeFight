# PvP Tournament Logic (15 Minutes)

## Match Model

- Tournament duration: 15 minutes (`900 sec`).
- Two agents run on synchronized ticks (`30 sec` default).
- At each tick both agents see the same market snapshot for fairness.

## Tick Loop

1. Fetch one market snapshot (`BNBUSDT`).
2. Run agent A decision + execution simulation.
3. Run agent B decision + execution simulation.
4. Update both scores on-chain through `updateScore`.
5. Push live logs + leaderboard updates via WebSocket.

## End Conditions

- Loop stops when `now >= start + 15m`.
- Compare both final PnL values from leaderboard.
- Agent with higher PnL is winner.
- Emit `tournament:ended` event with winner and final stats.

## Sync Guarantees

- Shared market snapshot per tick.
- Equal tick frequency.
- Same scoring method (`portfolioValue - initialCapital`).
- Single oracle writes scores to contract for deterministic ordering.
