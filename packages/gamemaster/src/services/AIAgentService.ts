import OpenAI from "openai";
import { buildTradingSystemPrompt } from "@aibattles/engine";
import { MarketSnapshot, PortfolioState } from "../types";

export class AIAgentService {
	private readonly client: OpenAI | null;
	private readonly model: string;

	constructor(apiKey?: string, model = "gpt-4o-mini") {
		this.model = model;
		this.client = apiKey ? new OpenAI({ apiKey }) : null;

		if (!apiKey) {
			console.warn("[AIAgentService] No OpenAI API key — using balance-aware heuristic fallback.");
		} else {
			console.log(`[AIAgentService] Initialized with model: ${model}`);
		}
	}

	/**
	 * Get a trade decision from the AI model (or heuristic fallback).
	 * `allMarkets` is optional extra context for multi-asset strategies.
	 */
	async createDecision(
		strategy: string,
		market: MarketSnapshot,
		portfolio: PortfolioState,
		allMarkets?: MarketSnapshot[],
	): Promise<string> {
		if (!this.client) {
			console.log("[AIAgentService] No OpenAI client — using heuristic fallback.");
			return this.makeHeuristicDecision(market, portfolio, allMarkets);
		}

		try {
			// Build user message with primary market + optional multi-token context
			const userContent: Record<string, unknown> = { market, portfolio };
			if (allMarkets && allMarkets.length > 1) {
				// Include dip analysis for all watched tokens
				userContent.marketScan = allMarkets.map((m) => ({
					symbol: m.symbol,
					price: m.price,
					priceChangePercent: m.priceChangePercent,
				}));
			}

			const completion = await this.client.chat.completions.create({
				model: this.model,
				temperature: 0.15,
				response_format: { type: "json_object" },
				messages: [
					{
						role: "system",
						content: buildTradingSystemPrompt(strategy),
					},
					{
						role: "user",
						content: JSON.stringify(userContent),
					},
				],
			});

			const content = completion.choices[0]?.message?.content;
			if (!content) {
				console.warn("[AIAgentService] Empty response from OpenAI — using heuristic fallback.");
				return this.makeHeuristicDecision(market, portfolio, allMarkets);
			}

			return content;
		} catch (error) {
			console.error(
				"[AIAgentService] OpenAI API call failed:",
				error instanceof Error ? error.message : error,
			);
			console.log("[AIAgentService] Falling back to balance-aware heuristic.");
			return this.makeHeuristicDecision(market, portfolio, allMarkets);
		}
	}

	/**
	 * Balance-aware heuristic:
	 *   Phase 1: Have BNB, no USDT → SELL BNB→USDT
	 *   Phase 2: Have USDT → BUY the token that dipped the most since 24h open
	 *            OR primary token if no multi-market data
	 */
	private makeHeuristicDecision(
		market: MarketSnapshot,
		portfolio: PortfolioState,
		allMarkets?: MarketSnapshot[],
	): string {
		const baseAsset = "BNB";

		const bnbVal = portfolio.baseBalance * market.price;
		const usdtVal = portfolio.quoteBalance;

		// Simple 12% Rebalance Strategy
		if (usdtVal > bnbVal) {
			console.log(`[AIAgentService] Heuristic: BUY 12% (USDT ${usdtVal.toFixed(2)} > BNB ${bnbVal.toFixed(2)})`);
			return JSON.stringify({
				action: "BUY",
				asset: baseAsset,
				amount_pct: 12, // User requested 12% swap
				reason: `Rebalance: Buying 12% (USDT > BNB).`,
			});
		} else {
			console.log(`[AIAgentService] Heuristic: SELL 12% (BNB ${bnbVal.toFixed(2)} >= USDT ${usdtVal.toFixed(2)})`);
			return JSON.stringify({
				action: "SELL",
				asset: baseAsset,
				amount_pct: 12, // User requested 12% swap
				reason: `Rebalance: Selling 12% (BNB >= USDT).`,
			});
		}
	}
}
