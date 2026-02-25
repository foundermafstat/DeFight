import { LeaderboardRow } from "../types";
import { SupabaseLeaderboardStore } from "./SupabaseLeaderboardStore";

interface LeaderboardOptions {
	scoreScale?: number;
	supabaseUrl?: string;
	supabaseKey?: string;
	supabaseTable?: string;
}

type StoredScore = {
	playerAddress: string;
	agentName: string;
	pnlCents: bigint;
	updatedAt: number;
};

export class LeaderboardService {
	private readonly scoreScale: number;
	private readonly memoryScores: Map<string, StoredScore>;
	private readonly supabaseStore: SupabaseLeaderboardStore;

	constructor(options: LeaderboardOptions) {
		this.scoreScale = options.scoreScale ?? 100;
		this.memoryScores = new Map();
		this.supabaseStore = new SupabaseLeaderboardStore({
			url: options.supabaseUrl,
			key: options.supabaseKey,
			tableName: options.supabaseTable,
		});
	}

	get isOnChain(): boolean {
		return false;
	}

	get isSupabaseEnabled(): boolean {
		return this.supabaseStore.isEnabled;
	}

	get storageMode(): "on-chain" | "on-chain+supabase" | "supabase" | "memory" {
		if (this.isSupabaseEnabled) {
			return "supabase";
		}
		return "memory";
	}

	get oracleAddress(): string {
		return "mock-oracle";
	}

	async updateScore(playerAddress: string, agentName: string, pnl: number, metadata?: string, onChain = false): Promise<void> {
		const pnlScaled = BigInt(Math.round(pnl * this.scoreScale));
		const updatedAt = Math.floor(Date.now() / 1000);

		const memoryRecord: StoredScore = {
			playerAddress,
			agentName,
			pnlCents: pnlScaled,
			updatedAt,
		};

		if (this.isSupabaseEnabled) {
			try {
				await this.supabaseStore.upsertScore({
					playerAddress,
					agentName,
					pnl,
					updatedAt,
				});
			} catch (error) {
				console.warn(
					`[LeaderboardService] Supabase write failed, fallback to in-memory: ${error instanceof Error ? error.message : "unknown error"}`,
				);

				this.memoryScores.set(playerAddress.toLowerCase(), memoryRecord);
			}

			return;
		}

		this.memoryScores.set(playerAddress.toLowerCase(), memoryRecord);
	}

	async getLeaderboard(): Promise<LeaderboardRow[]> {
		if (this.isSupabaseEnabled) {
			try {
				const rows = await this.supabaseStore.getLeaderboard();
				if (rows.length > 0 || this.memoryScores.size === 0) {
					return rows;
				}
			} catch (error) {
				console.warn(
					`[LeaderboardService] Supabase read failed, fallback to in-memory: ${error instanceof Error ? error.message : "unknown error"}`,
				);
			}
		}

		return Array.from(this.memoryScores.values())
			.map((row) => ({
				rank: 0,
				playerAddress: row.playerAddress,
				agentName: row.agentName,
				pnl: Number(row.pnlCents) / this.scoreScale,
				updatedAt: row.updatedAt,
			}))
			.sort((a, b) => b.pnl - a.pnl)
			.map((row, index) => ({ ...row, rank: index + 1 }));
	}
}

