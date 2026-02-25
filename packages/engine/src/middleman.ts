import { z } from "zod";
import {
  AgentDecision,
  ExecutionContext,
  ExchangeCall,
  MiddlemanResult,
} from "./types";

const DecisionSchema = z.object({
  action: z.enum(["BUY", "SELL", "HOLD"]),
  asset: z.string().min(2).max(12),
  amount_pct: z.number().min(0).max(100),
  reason: z.string().min(3).max(600),
});

function extractJsonPayload(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

export function normalizeDecision(input: unknown): AgentDecision {
  const raw = typeof input === "string" ? JSON.parse(extractJsonPayload(input)) : input;

  const parsed = DecisionSchema.parse(raw);
  return {
    action: parsed.action,
    asset: parsed.asset.toUpperCase(),
    amount_pct: parsed.amount_pct,
    reason: parsed.reason.trim(),
  };
}

export function decisionToExchangeCall(
  decision: AgentDecision,
  context: ExecutionContext,
): ExchangeCall | null {
  if (decision.action === "HOLD") {
    return null;
  }

  if (!context.symbol.endsWith(context.quoteAsset)) {
    throw new Error(`Symbol ${context.symbol} must end with ${context.quoteAsset}`);
  }

  if (context.lastPrice <= 0) {
    throw new Error("Invalid market price");
  }

  const pct = decision.amount_pct / 100;

  if (decision.action === "BUY") {
    const quoteOrderQty = Math.max(0, context.quoteBalance * pct);
    return {
      endpoint: "/api/v3/order",
      method: "POST",
      payload: {
        symbol: context.symbol,
        side: "BUY",
        type: "MARKET",
        quoteOrderQty: quoteOrderQty.toFixed(2),
      },
    };
  }

  const quantity = Math.max(0, context.baseBalance * pct);
  return {
    endpoint: "/api/v3/order",
    method: "POST",
    payload: {
      symbol: context.symbol,
      side: "SELL",
      type: "MARKET",
      quantity: quantity.toFixed(6),
    },
  };
}

export function processAgentSignal(input: unknown, context: ExecutionContext): MiddlemanResult {
  const decision = normalizeDecision(input);

  if (decision.asset !== context.symbol.replace(context.quoteAsset, "")) {
    throw new Error(
      `Asset mismatch. Decision asset=${decision.asset}, symbol=${context.symbol}`,
    );
  }

  const exchangeCall = decisionToExchangeCall(decision, context);
  return { decision, exchangeCall };
}
