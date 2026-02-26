import { processAgentSignal, ExecutionContext } from "@aibattles/engine";
import { Server } from "socket.io";
import { AgentConfig, MarketSnapshot, PortfolioState } from "../types";
import { AIAgentService } from "./AIAgentService";
import { LeaderboardService } from "./LeaderboardService";
import { MarketDataService, WATCHED_SYMBOLS } from "./MarketDataService";

// After a SELL we wait this many ms for the on-chain balance to settle before the next cycle
const POST_TRADE_SETTLE_MS = 2000;

interface RunStepInput {
	runId: string;
	agent: AgentConfig;
	symbol: string;
	source: "solo" | "tournament";
	io?: Server;
	market?: MarketSnapshot;
	allMarkets?: MarketSnapshot[];
}

interface RunSessionInput {
	runId: string;
	agent: AgentConfig;
	symbol: string;
	cycles: number;
	intervalMs: number;
	io?: Server;
}

const TRADE_FEE = 0.001;
const SIMULATED_INITIAL_DEPOSIT_BCH = 1.0;

export interface RunSessionSummary {
	runId: string;
	finalPnl: number;
	roiPct: number;
	tradesCount: number;
	profitableTrades: number;
	winRatePct: number;
	startedAt: number;
	endedAt: number;
}

interface RunStepResult {
	pnl: number;
	pnlDelta: number;
	market: MarketSnapshot;
	executed: boolean;
}

export class TradingOrchestrator {
	private readonly aiService: AIAgentService;
	private readonly marketDataService: MarketDataService;
	private readonly leaderboardService: LeaderboardService;
	private readonly portfolios: Map<string, PortfolioState>;
	private readonly stopFlags: Map<string, boolean>;

	constructor(
		aiService: AIAgentService,
		marketDataService: MarketDataService,
		leaderboardService: LeaderboardService,
	) {
		this.aiService = aiService;
		this.marketDataService = marketDataService;
		this.leaderboardService = leaderboardService;
		this.portfolios = new Map();
		this.stopFlags = new Map();
	}

	resetPortfolio(playerAddress: string): void {
		this.portfolios.delete(playerAddress.toLowerCase());
	}

	stopSession(playerAddress: string): void {
		this.stopFlags.set(playerAddress.toLowerCase(), true);
	}

	getPortfolio(playerAddress: string): PortfolioState | undefined {
		return this.portfolios.get(playerAddress.toLowerCase());
	}

	async runSession(input: RunSessionInput): Promise<RunSessionSummary> {
		const startedAt = Date.now();
		let finalPnl = 0;
		let tradesCount = 0;
		let profitableTrades = 0;
		const playerKey = input.agent.playerAddress.toLowerCase();

		this.stopFlags.delete(playerKey);

		try {
			// Simulate initial deposit for paper trading
			const initialBalances = { BCH: SIMULATED_INITIAL_DEPOSIT_BCH, token: 0 };
			const portfolio = await this.getOrCreatePortfolio(input.agent.playerAddress);
			portfolio.baseBalance = initialBalances.BCH;
			portfolio.quoteBalance = initialBalances.token;

			const m = await this.marketDataService.getSnapshot(input.symbol);
			if (m && m.price > 0) {
				portfolio.initialMarketPrice = m.price;
				const startBCH = initialBalances.BCH;
				const startTokens = initialBalances.token;
				const totalStartValueInBCH = startBCH + (startTokens / m.price);
				portfolio.initialTotalBCHValue = totalStartValueInBCH;

				console.log(`[TradingOrchestrator] Session Start: ${startBCH.toFixed(6)} BCH + ${startTokens.toFixed(2)} Tokens | Total Value: ${totalStartValueInBCH.toFixed(6)} BCH`);
			}

			if (!portfolio.depositBCH) {
				portfolio.depositBCH = initialBalances.BCH;
			}
		} catch (e) {
			console.warn("[TradingOrchestrator] Could not snapshot initial deposit:", e);
		}

		let sessionMarkets: MarketSnapshot[] = [];
		try {
			sessionMarkets = await this.marketDataService.getMultiSnapshot([...WATCHED_SYMBOLS]);
		} catch (e) {
			console.warn("[TradingOrchestrator] Multi-market scan failed, using primary only:", e);
		}

		for (let cycle = 1; cycle <= input.cycles; cycle++) {
			if (this.stopFlags.get(playerKey)) {
				console.log(`[TradingOrchestrator] Session stopped early at cycle ${cycle} for ${playerKey}`);
				break;
			}

			const stepResult = await this.runStep({
				runId: input.runId,
				agent: input.agent,
				symbol: input.symbol,
				source: "solo",
				io: input.io,
				allMarkets: sessionMarkets.length > 0 ? sessionMarkets : undefined,
			});

			finalPnl = stepResult.pnl;
			if (stepResult.executed) {
				tradesCount += 1;
				if (stepResult.pnlDelta > 0) {
					profitableTrades += 1;
				}
			}

			if (cycle % 5 === 0 && sessionMarkets.length > 0) {
				try {
					sessionMarkets = await this.marketDataService.getMultiSnapshot([...WATCHED_SYMBOLS]);
				} catch {
				}
			}

			if (cycle < input.cycles) {
				const tickMs = 500;
				const ticks = Math.ceil(input.intervalMs / tickMs);
				for (let t = 0; t < ticks; t++) {
					if (this.stopFlags.get(playerKey)) break;
					await this.delay(Math.min(tickMs, input.intervalMs - t * tickMs));
				}
			}
		}

		await this.liquidatePositions(input.agent.playerAddress, input.symbol);

		const endedAt = Date.now();
		const portfolio = await this.getOrCreatePortfolio(input.agent.playerAddress);

		let roiPct = 0;
		try {
			const finalMarket = await this.marketDataService.getSnapshot(input.symbol);
			const finalBCH = portfolio.baseBalance;
			const initialBCH = portfolio.depositBCH;

			if (initialBCH && initialBCH > 0.0001) {
				const pnlBCH = finalBCH - initialBCH;
				roiPct = (pnlBCH / initialBCH) * 100;
				finalPnl = pnlBCH * finalMarket.price;
				console.log(
					`[TradingOrchestrator] Final ROI: Initial=${initialBCH.toFixed(6)} BCH,` +
					` Final=${finalBCH.toFixed(6)} BCH → PnL=${pnlBCH.toFixed(6)} BCH ($${finalPnl.toFixed(4)}), ROI=${roiPct.toFixed(2)}%`
				);
			} else {
				finalPnl = 0;
				roiPct = 0;
			}
		} catch (e) {
			console.warn("[TradingOrchestrator] Could not fetch final balances for ROI, using lastPnl:", e);
			finalPnl = portfolio.lastPnl;
			roiPct = 0;
		}

		const winRatePct = tradesCount === 0
			? 0
			: (profitableTrades / tradesCount) * 100;

		input.io?.emit("run:completed", {
			runId: input.runId,
			playerAddress: input.agent.playerAddress,
			summary: {
				finalPnl,
				roiPct,
				tradesCount,
				winRatePct,
			},
		});

		return {
			runId: input.runId,
			finalPnl,
			roiPct,
			tradesCount,
			profitableTrades,
			winRatePct,
			startedAt,
			endedAt,
		};
	}

	async runStep(input: RunStepInput): Promise<RunStepResult> {
		const market = input.market ?? (await this.marketDataService.getSnapshot(input.symbol));
		const portfolio = await this.syncPortfolio(input.agent.playerAddress);

		const currentVal = portfolio.quoteBalance + portfolio.baseBalance * market.price;
		if (portfolio.initialCapital === 0 && currentVal > 0) {
			portfolio.initialCapital = currentVal;
		}

		const previousPnl = portfolio.lastPnl;

		const decisionPayload = await this.aiService.createDecision(
			input.agent.strategy,
			market,
			portfolio,
			input.allMarkets,
		);

		const executionContext: ExecutionContext = {
			symbol: input.symbol,
			quoteAsset: "USDT",
			quoteBalance: portfolio.quoteBalance,
			baseBalance: portfolio.baseBalance,
			lastPrice: market.price,
		};

		const { decision, exchangeCall } = processAgentSignal(decisionPayload, executionContext);

		const executionDetails = await this.applyTrade(portfolio, market.price, exchangeCall);

		const portfolioValue = portfolio.quoteBalance + portfolio.baseBalance * market.price;
		const pnl = portfolioValue - portfolio.initialCapital;
		portfolio.lastPnl = pnl;

		await this.leaderboardService.updateScore(input.agent.playerAddress, input.agent.agentName, pnl);
		const leaderboard = await this.leaderboardService.getLeaderboard();

		const scanInfo = input.allMarkets && input.allMarkets.length > 1
			? ` | Watching: ${input.allMarkets.map(m => `${m.symbol.replace("USDT", "")}(${m.priceChangePercent.toFixed(1)}%)`).join(", ")}`
			: "";

		input.io?.emit("live-log", {
			runId: input.runId,
			source: input.source,
			playerAddress: input.agent.playerAddress,
			agentName: input.agent.agentName,
			timestamp: Date.now(),
			market,
			decision,
			exchangeCall,
			executionDetails,
			portfolio,
			pnl,
			scanInfo,
		});

		input.io?.emit("leaderboard:update", leaderboard);

		return {
			pnl,
			pnlDelta: pnl - previousPnl,
			market,
			executed: executionDetails.executed,
		};
	}

	private async getOrCreatePortfolio(playerAddress: string): Promise<PortfolioState> {
		const key = playerAddress.toLowerCase();
		const existing = this.portfolios.get(key);
		if (existing) {
			return existing;
		}

		const starting: PortfolioState = {
			quoteBalance: 0,
			baseBalance: SIMULATED_INITIAL_DEPOSIT_BCH,
			initialCapital: 0,
			lastPnl: 0,
			depositBCH: SIMULATED_INITIAL_DEPOSIT_BCH,
		};

		this.portfolios.set(key, starting);
		return starting;
	}

	private async syncPortfolio(playerAddress: string): Promise<PortfolioState> {
		const portfolio = await this.getOrCreatePortfolio(playerAddress);
		return portfolio;
	}

	private async applyTrade(
		portfolio: PortfolioState,
		price: number,
		exchangeCall: ReturnType<typeof processAgentSignal>["exchangeCall"],
	): Promise<{ executed: boolean; side?: string; quoteSpent?: number; baseMoved?: number; txHash?: string; }> {
		if (!exchangeCall) {
			return { executed: false };
		}

		if (exchangeCall.payload.side === "BUY") {
			const rawQuoteQty = Number(exchangeCall.payload.quoteOrderQty ?? "0");
			const availableQuote = portfolio.quoteBalance;
			const quoteToSpend = Math.min(availableQuote, rawQuoteQty);

			if (quoteToSpend <= 0) {
				return { executed: false };
			}

			portfolio.quoteBalance = Math.max(0, portfolio.quoteBalance - quoteToSpend);
			portfolio.baseBalance += (quoteToSpend / price) * (1 - TRADE_FEE);

			return {
				executed: true,
				side: "BUY",
				quoteSpent: quoteToSpend,
				baseMoved: quoteToSpend / price,
				txHash: "simulated_buy",
			};
		}

		if (exchangeCall.payload.side === "SELL") {
			const rawBaseQty = Number(exchangeCall.payload.quantity ?? "0");
			const availableBase = portfolio.baseBalance;
			const baseToSell = Math.min(availableBase, rawBaseQty);

			if (baseToSell <= 0) {
				return { executed: false };
			}

			portfolio.baseBalance = Math.max(0, portfolio.baseBalance - baseToSell);
			portfolio.quoteBalance += (baseToSell * price) * (1 - TRADE_FEE);

			await this.delay(POST_TRADE_SETTLE_MS);

			return {
				executed: true,
				side: "SELL",
				quoteSpent: baseToSell * price,
				baseMoved: baseToSell,
				txHash: "simulated_sell",
			};
		}

		return { executed: false };
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private async liquidatePositions(playerAddress: string, symbol: string): Promise<void> {
		try {
			const portfolio = await this.getOrCreatePortfolio(playerAddress);
			if (portfolio.quoteBalance > 0.1) {
				const market = await this.marketDataService.getSnapshot(symbol);
				portfolio.baseBalance += (portfolio.quoteBalance / (market.price || 1)) * (1 - TRADE_FEE);
				portfolio.quoteBalance = 0;
				await this.delay(POST_TRADE_SETTLE_MS);
			}
		} catch (e) {
			console.warn("[TradingOrchestrator] Liquidation failed:", e);
		}
	}
}
