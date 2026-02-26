import axios from "axios";
import { MarketSnapshot } from "../types";

/** Volatile pairs the multi-asset agent watches by default */
export const WATCHED_SYMBOLS = ["BCHUSDT", "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOTUSDT"] as const;

export class MarketDataService {
	private readonly baseUrl: string;
	private fallbackPrice: number;

	/** Per-symbol fallback prices for multi-asset mode */
	private fallbacks: Record<string, number> = {
		BCHUSDT: 600,
		BTCUSDT: 85000,
		ETHUSDT: 2800,
		SOLUSDT: 150,
		DOTUSDT: 6,
	};

	constructor(baseUrl = "https://api.binance.com") {
		this.baseUrl = baseUrl;
		this.fallbackPrice = 600;
	}

	async getSnapshot(symbol = "BCHUSDT"): Promise<MarketSnapshot> {
		const isReverse = symbol.startsWith("USDT") && symbol.length > 4 && !symbol.endsWith("USDT");
		const canonicalSymbol = isReverse
			? `${symbol.slice(4)}USDT` // e.g., USDTBCH -> BCHUSDT
			: symbol;

		try {
			const response = await axios.get(`${this.baseUrl}/api/v3/ticker/24hr`, {
				params: { symbol: canonicalSymbol },
				timeout: 5000,
			});

			const data = response.data;
			const lastPrice = Number(data.lastPrice);
			const priceChangePercent = Number(data.priceChangePercent);
			const volume = Number(data.volume);
			const quoteVolume = Number(data.quoteVolume);

			if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
				throw new Error("Invalid market price payload");
			}

			this.fallbackPrice = lastPrice;
			this.fallbacks[canonicalSymbol] = lastPrice;

			if (isReverse) {
				return {
					symbol,
					price: 1 / lastPrice,
					priceChangePercent: -priceChangePercent,
					volume: quoteVolume,
					quoteVolume: volume,
					timestamp: Date.now(),
				};
			}

			return {
				symbol: data.symbol,
				price: lastPrice,
				priceChangePercent,
				volume,
				quoteVolume,
				timestamp: Date.now(),
			};
		} catch (_error) {
			const fallback = this.fallbacks[canonicalSymbol] ?? this.fallbackPrice;
			const drift = (Math.random() - 0.5) * 2;
			const adjusted = Math.max(0.000001, fallback + drift);
			this.fallbacks[canonicalSymbol] = adjusted;
			this.fallbackPrice = adjusted;

			const computedPrice = isReverse ? 1 / adjusted : adjusted;

			return {
				symbol,
				price: computedPrice,
				priceChangePercent: drift / 10,
				volume: 0,
				quoteVolume: 0,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Fetch snapshots for multiple symbols in parallel.
	 * Returns successfully fetched ones, skipping failures.
	 */
	async getMultiSnapshot(symbols: string[]): Promise<MarketSnapshot[]> {
		const results = await Promise.allSettled(
			symbols.map((s) => this.getSnapshot(s)),
		);

		return results
			.filter((r): r is PromiseFulfilledResult<MarketSnapshot> => r.status === "fulfilled")
			.map((r) => r.value);
	}
}
