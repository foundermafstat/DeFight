export interface BotStats {
    tokenId: string; // The specific NFT token commitment hex
    name: string;
    level: number;
    winRate: number;
    tournamentsPlayed: number;
    pnl: number;
}

export class BcmrService {
    private categoryId: string;

    constructor(categoryId: string) {
        this.categoryId = categoryId;
    }

    /**
     * Generates a valid BCMR JSON for the DeFight Category.
     * This is dynamically generated when a wallet requests the BCMR URL.
     * 
     * @param bots Array of bot stats retrieved from the database
     */
    public generateDynamicBcmr(bots: BotStats[]): Record<string, any> {
        const tokens: Record<string, any> = {};

        for (const bot of bots) {
            tokens[bot.tokenId] = {
                name: bot.name,
                description: `WinRate: ${(bot.winRate * 100).toFixed(0)}% | PnL: ${bot.pnl > 0 ? '+' : ''}$${bot.pnl.toFixed(2)} | Level: ${bot.level}`,
                uris: {
                    icon: `https://defight.app/api/images/bot/${bot.tokenId}.png` // Placeholder
                },
                extensions: {
                    defight: {
                        level: bot.level,
                        winRate: bot.winRate,
                        tournamentsPlayed: bot.tournamentsPlayed,
                        pnl: bot.pnl
                    }
                }
            };
        }

        return {
            "$schema": "https://cashtokens.org/bcmr-v2.schema.json",
            "version": {
                "time": new Date().toISOString(),
                "version": "1.0.0"
            },
            "registryIdentities": {
                [this.categoryId]: {
                    "name": "DeFight Bots Collection",
                    "description": "Dynamic AI Trading Bots for DeFight Battles on CashTokens",
                    "uris": {
                        "web": "https://defight.app"
                    },
                    "tokens": tokens
                }
            }
        };
    }
}
