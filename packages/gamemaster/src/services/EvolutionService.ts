import OpenAI from "openai";

export interface BotStrategy {
    name: string;
    description: string;
    pairs: string[];
    strategy: Record<string, any>;
}

export interface EvolutionResult {
    originalPnl: number;
    bestShadow: BotStrategy | null;
    bestShadowPnl: number;
    shadowsTested: number;
}

export class EvolutionService {
    private readonly client: OpenAI | null;

    constructor(apiKey?: string) {
        this.client = apiKey ? new OpenAI({ apiKey }) : null;

        if (!apiKey) {
            console.warn("[EvolutionService] No OpenAI API key - mutation will feature mock responses.");
        } else {
            console.log("[EvolutionService] Initialized with GPT-4 turbo");
        }
    }

    /**
     * Main entry point to evolve a bot's strategy using shadow bots
     */
    async evolveBot(originalPrompt: string, originalStrategy: BotStrategy): Promise<EvolutionResult> {
        console.log(`[EvolutionService] Starting evolution for bot: ${originalStrategy.name}`);

        // 1. Generate Shadows (Mutations)
        const shadows = await this.generateShadowBots(originalPrompt, originalStrategy);
        console.log(`[EvolutionService] Generated ${shadows.length} shadow bots for testing.`);

        // 2. Run Backtests
        const originalPnl = await this.runBacktest(originalStrategy, "1M");
        let bestShadow: BotStrategy | null = null;
        let maxPnl = originalPnl; // Only replace if a shadow beats the original

        for (const shadow of shadows) {
            const pnl = await this.runBacktest(shadow, "1M");
            console.log(`[EvolutionService] Shadow bot "${shadow.name}" scored PnL: ${pnl}`);

            if (pnl > maxPnl) {
                maxPnl = pnl;
                bestShadow = shadow;
            }
        }

        if (bestShadow) {
            console.log(`[EvolutionService] Evolution successful! Winner: ${bestShadow.name} (PnL: ${maxPnl})`);
        } else {
            console.log(`[EvolutionService] No shadow beat the original strategy (PnL: ${originalPnl})`);
        }

        return {
            originalPnl,
            bestShadow,
            bestShadowPnl: bestShadow ? maxPnl : originalPnl,
            shadowsTested: shadows.length
        };
    }

    /**
     * Mutates the original strategy using OpenAI to create 'shadow' bots 
     */
    private async generateShadowBots(prompt: string, originalStrategy: BotStrategy): Promise<BotStrategy[]> {
        if (!this.client) {
            // Mock shadows for dev without API Key
            return [
                { ...originalStrategy, name: originalStrategy.name + " (Aggressive Shadow)" },
                { ...originalStrategy, name: originalStrategy.name + " (Conservative Shadow)" }
            ];
        }

        try {
            const systemPrompt = `You are an AI engineer in the DeFight project. The user provides you with the original prompt of a trading bot strategy and its current JSON code.
Your task is to generate 3 "shadow" bots — mutations of the original to improve PnL.
Change indicator parameters, risk tolerance, and timeframes, but preserve the overall spirit of the strategy.
The format of the response must be STRICTLY JSON, containing a 'mutations' array, where each element is the full structure of the bot:
{
  "mutations": [
    {
      "name": "Shadow bot name",
      "description": "Description of the change",
      "pairs": ["BCH/USD"],
      "strategy": { ... }
    }
  ]
}`;

            const completion = await this.client.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: `Original Prompt: "${prompt}"\n\nOriginal Strategy JSON: ${JSON.stringify(originalStrategy)}`
                    }
                ],
                response_format: { type: "json_object" }
            });

            const response = JSON.parse(completion.choices[0]?.message?.content || "{}");
            return response.mutations || [];

        } catch (error) {
            console.error("[EvolutionService] Failed to generate shadow bots:", error);
            return [];
        }
    }

    /**
     * Simulates a backtest on historical data to output a PnL score
     */
    private async runBacktest(strategy: BotStrategy, period: string = "1M"): Promise<number> {
        // In a real scenario, this would connect to a full Backtesting Engine (e.g. vectorbt/ccxt).
        // Here we simulate the backtesting engine.

        // Determine base quality of the bot config based on some simple heuristics to make it deterministic-ish
        const indicatorCount = (strategy.strategy?.buy_indicators?.length || 0) + (strategy.strategy?.sell_indicators?.length || 0);
        const riskFactor = strategy.strategy?.risk_tolerance || 0.5;

        // Mock simulation: 
        // Random PnL between -10 and +30, influenced by the indicator count
        let mockPnl = (Math.random() * 40 - 10) + (indicatorCount * 2);

        // Higher risk = higher variance
        mockPnl += (Math.random() > 0.5 ? 1 : -1) * (riskFactor * 15);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return Number(mockPnl.toFixed(2));
    }
}
