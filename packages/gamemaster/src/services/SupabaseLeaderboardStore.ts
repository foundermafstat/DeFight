import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LeaderboardRow } from "../types";

interface SupabaseLeaderboardStoreOptions {
  url?: string;
  key?: string;
  tableName?: string;
}

interface LeaderboardScoreRow {
  player_address: string;
  agent_name: string;
  pnl: number | string;
  updated_at: number | string;
}

interface UpsertScoreInput {
  playerAddress: string;
  agentName: string;
  pnl: number;
  updatedAt: number;
}

export class SupabaseLeaderboardStore {
  private readonly client: SupabaseClient | null;
  private readonly tableName: string;

  constructor(options: SupabaseLeaderboardStoreOptions) {
    this.tableName = options.tableName || "leaderboard_scores";

    if (!options.url || !options.key) {
      this.client = null;
      return;
    }

    this.client = createClient(options.url, options.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  async upsertScore(input: UpsertScoreInput): Promise<void> {
    if (!this.client) {
      return;
    }

    const payload: LeaderboardScoreRow = {
      player_address: input.playerAddress.toLowerCase(),
      agent_name: input.agentName,
      pnl: input.pnl,
      updated_at: input.updatedAt,
    };

    const { error } = await this.client
      .from(this.tableName)
      .upsert(payload, { onConflict: "player_address" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }

  async getLeaderboard(): Promise<LeaderboardRow[]> {
    if (!this.client) {
      return [];
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .select("player_address, agent_name, pnl, updated_at")
      .order("pnl", { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(`Supabase read failed: ${error.message}`);
    }

    const rows = (data ?? [])
      .map((row: LeaderboardScoreRow) => ({
        rank: 0,
        playerAddress: row.player_address,
        agentName: row.agent_name,
        pnl: Number(row.pnl),
        updatedAt: Number(row.updated_at),
      }))
      .filter((row) => Number.isFinite(row.pnl) && Number.isFinite(row.updatedAt));

    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }
}

