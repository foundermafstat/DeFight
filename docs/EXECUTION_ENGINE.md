# Execution Engine (Middleman) Logic

## Goal

Transform raw LLM output into deterministic execution payload for an exchange-style API call.

## Contract Between LLM and Engine

LLM must respond with JSON only:

```json
{
  "action": "BUY",
  "asset": "BNB",
  "amount_pct": 10,
  "reason": "Momentum confirmed by volume"
}
```

## Middleman Steps

1. Extract JSON body (from plain JSON or fenced block).
2. Validate with strict schema:
   - `action`: `BUY | SELL | HOLD`
   - `asset`: string
   - `amount_pct`: 0..100
   - `reason`: bounded text
3. Verify asset/symbol consistency (`BNB` vs `BNBUSDT`).
4. Convert to executable call:
   - BUY => use `quoteOrderQty`
   - SELL => use `quantity`
   - HOLD => no call
5. Return deterministic payload for adapter:

```json
{
  "endpoint": "/api/v3/order",
  "method": "POST",
  "payload": {
    "symbol": "BNBUSDT",
    "side": "BUY",
    "type": "MARKET",
    "quoteOrderQty": "100.00"
  }
}
```

## Node.js Usage Example

```ts
import { processAgentSignal } from "@aibattles/engine";

const result = processAgentSignal(llmJson, {
  symbol: "BNBUSDT",
  quoteAsset: "USDT",
  quoteBalance: 1000,
  baseBalance: 0.5,
  lastPrice: 620,
});

if (result.exchangeCall) {
  // exchangeAdapter.execute(result.exchangeCall)
}
```
