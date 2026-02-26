export interface MarketSnapshot {
	symbol: string;
	price: number;
	priceChangePercent: number;
	volume: number;
	quoteVolume: number;
	timestamp: number;
}

export interface AgentConfig {
	playerAddress: string;
	agentName: string;
	strategy: string;
}

export interface PortfolioState {
	quoteBalance: number;
	baseBalance: number;
	initialCapital: number;
	lastPnl: number;
	/** BCH amount deposited at session start — used for final ROI calculation */
	depositBCH?: number;
	/** Total portfolio value in BCH terms at session start (includes existing token holdings) */
	initialTotalBCHValue?: number;
	/** BCH Price at session start */
	initialMarketPrice?: number;
	/** Balances of other watched tokens (e.g. BTC, ETH, SOL) */
	assets?: Record<string, number>;
}

/** Snapshot of multiple token pairs for multi-asset agent decisions */
export interface MultiTokenSnapshot {
	symbol: string;
	price: number;
	priceChangePercent: number;
	/** Price at session start, used to detect dip opportunities */
	priceAtStart?: number;
	dipPct?: number; // negative means price fell since start
}

export interface LeaderboardRow {
	rank: number;
	playerAddress: string;
	agentName: string;
	pnl: number;
	updatedAt: number;
}
