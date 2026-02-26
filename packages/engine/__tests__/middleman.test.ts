import { describe, expect, it } from "vitest";
import { processAgentSignal } from "../src/middleman";

describe("processAgentSignal", () => {
  it("maps BUY decision to quoteOrderQty payload", () => {
    const { decision, exchangeCall } = processAgentSignal(
      {
        action: "BUY",
        asset: "BCH",
        amount_pct: 25,
        reason: "Momentum breakout",
      },
      {
        symbol: "BCHUSDT",
        quoteAsset: "USDT",
        quoteBalance: 1000,
        baseBalance: 2,
        lastPrice: 500,
      },
    );

    expect(decision.action).toBe("BUY");
    expect(exchangeCall?.payload.quoteOrderQty).toBe("250.00");
  });

  it("returns null call for HOLD", () => {
    const { exchangeCall } = processAgentSignal(
      {
        action: "HOLD",
        asset: "BCH",
        amount_pct: 0,
        reason: "No clear edge",
      },
      {
        symbol: "BCHUSDT",
        quoteAsset: "USDT",
        quoteBalance: 1000,
        baseBalance: 2,
        lastPrice: 500,
      },
    );

    expect(exchangeCall).toBeNull();
  });
});
