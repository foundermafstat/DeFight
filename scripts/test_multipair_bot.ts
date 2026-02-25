import { AIAgentService } from "../packages/gamemaster/src/services/AIAgentService";
import { MarketDataService } from "../packages/gamemaster/src/services/MarketDataService";
import { processAgentSignal, ExecutionContext } from "@aibattles/engine";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in environment");
    process.exit(1);
}

const aiService = new AIAgentService(OPENAI_API_KEY, process.env.OPENAI_MODEL || "gpt-4o-mini");
const marketDataService = new MarketDataService(process.env.BINANCE_BASE_URL);

// Portfolios mapped by base coin (e.g. PEPE, WIF, DOGE, SHIB) sharing a common quote balance (USDT)
class MultiPairPortfolio {
    quoteBalance: number = 100; // Start with 100 USDT
    baseBalances: Record<string, number> = {};
    initialCapital: number = 100;

    getBalance(symbol: string) {
        const baseAsset = symbol.replace("USDT", "");
        return {
            quoteBalance: this.quoteBalance,
            baseBalance: this.baseBalances[baseAsset] || 0,
            initialCapital: this.initialCapital,
            lastPnl: 0,
            depositBnb: 0,
        };
    }

    executeTrade(symbol: string, side: "BUY" | "SELL", amountUsdt: number, price: number): boolean {
        const baseAsset = symbol.replace("USDT", "");
        const FEE = 0.001; // 0.1%

        if (!this.baseBalances[baseAsset]) {
            this.baseBalances[baseAsset] = 0;
        }

        if (side === "BUY") {
            if (this.quoteBalance < amountUsdt) return false;
            const tokensBought = (amountUsdt / price) * (1 - FEE);
            this.quoteBalance -= amountUsdt;
            this.baseBalances[baseAsset] += tokensBought;
            return true;
        } else if (side === "SELL") {
            const tokensToSell = amountUsdt / price;
            if (this.baseBalances[baseAsset] < tokensToSell) return false;
            const usdtReceived = (tokensToSell * price) * (1 - FEE);
            this.baseBalances[baseAsset] -= tokensToSell;
            this.quoteBalance += usdtReceived;
            return true;
        }
        return false;
    }
}

const botPortfolio = new MultiPairPortfolio();
const TARGET_PAIRS = ["PEPEUSDT", "WIFUSDT", "DOGEUSDT", "SHIBUSDT"];

const BOT_STRATEGY = `
You are a high-frequency trading bot operating on a single volatile pair.
Your goal is to scalp small profits.
- If price is dipping and RSI is roughly under 40, BUY with 20% of quote.
- If price is pumping, SELL 50% of your base holdings.
- Always output valid JSON using the schema: { action: "BUY"|"SELL"|"HOLD", asset: string, amount_pct: number, reason: string }
`;

async function runTick() {
    console.log("\n-------------------------------------------");
    console.log(`⏱️ Tick -> Virtual Bank: $${botPortfolio.quoteBalance.toFixed(2)} USDT`);
    console.log(`Holdings: `, Object.entries(botPortfolio.baseBalances).filter(([_, amt]) => amt > 0).map(([asset, amt]) => `${amt.toFixed(2)} ${asset}`).join(", "));

    // 1. Fetch all markets
    console.log("Fetching markets...");
    let allMarkets: any[];
    try {
        allMarkets = await marketDataService.getMultiSnapshot(TARGET_PAIRS);
    } catch (e) {
        console.error("Failed to fetch markets:");
        return;
    }


    // 2. Iterate each pair and ask AI for a decision
    for (const symbol of TARGET_PAIRS) {
        const market = allMarkets.find(m => m.symbol === symbol);
        if (!market) continue;

        console.log(`\n🤖 Analyzing ${symbol} @ $${market.price}...`);

        const subPortfolio = botPortfolio.getBalance(symbol);
        try {
            const decisionStr = await aiService.createDecision(
                BOT_STRATEGY,
                market,
                subPortfolio,
                allMarkets
            );

            // Mock execution context for processAgentSignal
            const executionContext: ExecutionContext = {
                symbol: symbol,
                quoteAsset: "USDT",
                quoteBalance: subPortfolio.quoteBalance,
                baseBalance: subPortfolio.baseBalance,
                lastPrice: market.price,
            };

            // Force the AI decision's asset to not have USDT if it accidentally included it
            let parsedObj;
            try {
                parsedObj = JSON.parse(decisionStr);
                parsedObj.asset = symbol.replace("USDT", "");
            } catch (e) { /* ignore */ }

            const decisionStrFixed = parsedObj ? JSON.stringify(parsedObj) : decisionStr;

            const { decision, exchangeCall } = processAgentSignal(decisionStrFixed, executionContext);

            if (decision.action === "HOLD" || !exchangeCall) {
                console.log(`   -> ⏸️ AI decided to HOLD. Reason: ${decision.reason.substring(0, 60)}...`);
                continue;
            }

            // Execute local simulated trade
            if (exchangeCall.payload.side === "BUY") {
                const quoteOrderQty = Number(exchangeCall.payload.quoteOrderQty || 0);
                const success = botPortfolio.executeTrade(symbol, "BUY", quoteOrderQty, market.price);
                if (success) {
                    console.log(`   -> 🟢 Executed BUY ${quoteOrderQty.toFixed(2)} USDT worth of ${symbol}.`);
                } else {
                    console.log(`   -> ❌ Failed BUY (insufficient USDT).`);
                }
            } else if (exchangeCall.payload.side === "SELL") {
                const quantity = Number(exchangeCall.payload.quantity || 0);
                const quoteAmount = quantity * market.price;
                const success = botPortfolio.executeTrade(symbol, "SELL", quoteAmount, market.price);
                if (success) {
                    console.log(`   -> 🔴 Executed SELL ${quantity.toFixed(2)} ${symbol.replace("USDT", "")} (~$${quoteAmount.toFixed(2)}).`);
                } else {
                    console.log(`   -> ❌ Failed SELL (insufficient base asset).`);
                }
            }
            console.log(`      Reason: ${decision.reason.substring(0, 100)}...`);

        } catch (e: any) {
            console.log(`   -> ⚠️ AI Engine Error for ${symbol}: ${e.message}`);
        }
    }
}

async function startBot() {
    console.log("🚀 Starting Multi-Pair AI Trading Bot Simulator");
    console.log(`Tracking pairs: ${TARGET_PAIRS.join(", ")}`);

    // Run infinitely every 10 seconds
    while (true) {
        await runTick();
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

startBot();
