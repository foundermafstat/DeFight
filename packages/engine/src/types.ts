export type AgentAction = "BUY" | "SELL" | "HOLD";

export interface AgentDecision {
  action: AgentAction;
  asset: string;
  amount_pct: number;
  reason: string;
}

export interface ExecutionContext {
  symbol: string;
  quoteAsset: string;
  quoteBalance: number;
  baseBalance: number;
  lastPrice: number;
}

export interface ExchangeCall {
  endpoint: string;
  method: "POST";
  payload: {
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET";
    quoteOrderQty?: string;
    quantity?: string;
  };
}

export interface MiddlemanResult {
  decision: AgentDecision;
  exchangeCall: ExchangeCall | null;
}
