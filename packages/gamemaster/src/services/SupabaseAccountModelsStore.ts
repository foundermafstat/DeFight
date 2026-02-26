import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface SupabaseAccountModelsStoreOptions {
	url?: string;
	key?: string;
	usersTable?: string;
	modelsTable?: string;
	runsTable?: string;
}

interface UserRow {
	id: string;
	wallet_address: string;
	chain_id: number;
	created_at: string;
	last_login_at: string;
}

interface ModelRow {
	id: string;
	user_id: string;
	model_name: string;
	description: string;
	prompt_text: string;
	llm_model: string;
	symbol: string;
	settings_json: Record<string, unknown>;
	total_runs: number;
	total_trades: number;
	profitable_trades: number;
	average_roi_pct: number;
	best_roi_pct: number | null;
	worst_roi_pct: number | null;
	best_pnl: number | null;
	last_pnl: number | null;
	last_roi_pct: number | null;
	last_result_at: string | null;
	created_at: string;
	updated_at: string;
}

interface RunRow {
	id: string;
	run_id: string;
	model_id: string;
	user_id: string;
	source: string;
	pnl: number;
	roi_pct: number;
	trades_count: number;
	profitable_trades: number;
	win_rate_pct: number;
	cycles: number;
	interval_ms: number;
	started_at: string;
	ended_at: string;
	meta: Record<string, unknown>;
	created_at: string;
}

export interface PromptModelEntity {
	id: string;
	modelName: string;
	description: string;
	prompt: string;
	llmModel: string;
	symbol: string;
	settings: Record<string, unknown>;
	totalRuns: number;
	totalTrades: number;
	profitableTrades: number;
	averageRoiPct: number;
	bestRoiPct: number | null;
	worstRoiPct: number | null;
	bestPnl: number | null;
	lastPnl: number | null;
	lastRoiPct: number | null;
	lastResultAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PromptModelRunEntity {
	id: string;
	runId: string;
	source: string;
	pnl: number;
	roiPct: number;
	tradesCount: number;
	profitableTrades: number;
	winRatePct: number;
	cycles: number;
	intervalMs: number;
	startedAt: string;
	endedAt: string;
	createdAt: string;
	meta: Record<string, unknown>;
}

interface UpsertModelInput {
	walletAddress: string;
	chainId: number;
	modelName: string;
	description?: string;
	prompt: string;
	llmModel: string;
	symbol: string;
	settings?: Record<string, unknown>;
}

interface RecordRunInput {
	walletAddress: string;
	chainId: number;
	modelId?: string;
	modelName: string;
	prompt: string;
	llmModel: string;
	symbol: string;
	runId: string;
	source: "solo" | "tournament";
	pnl: number;
	roiPct: number;
	tradesCount: number;
	profitableTrades: number;
	winRatePct: number;
	cycles: number;
	intervalMs: number;
	startedAt: number;
	endedAt: number;
	meta?: Record<string, unknown>;
}

export class SupabaseAccountModelsStore {
	private readonly client: SupabaseClient | null;
	private readonly usersTable: string;
	private readonly modelsTable: string;
	private readonly runsTable: string;

	constructor(options: SupabaseAccountModelsStoreOptions) {
		this.usersTable = options.usersTable || "auth_users";
		this.modelsTable = options.modelsTable || "user_prompt_models";
		this.runsTable = options.runsTable || "user_prompt_model_runs";

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

	async touchUserLogin(walletAddress: string, chainId: number): Promise<void> {
		if (!this.client) {
			return;
		}

		await this.upsertUser(walletAddress, chainId);
	}

	async listModelsForUser(walletAddress: string): Promise<PromptModelEntity[]> {
		if (!this.client) {
			return [];
		}

		const user = await this.getUserByWallet(walletAddress);
		if (!user) {
			return [];
		}

		const { data, error } = await this.client
			.from(this.modelsTable)
			.select("*")
			.eq("user_id", user.id)
			.order("updated_at", { ascending: false });

		if (error) {
			throw new Error(`Supabase list models failed: ${error.message}`);
		}

		return (data ?? []).map((row: unknown) => this.mapModelRow(row as ModelRow));
	}

	async upsertModelForUser(input: UpsertModelInput): Promise<PromptModelEntity> {
		if (!this.client) {
			throw new Error("Supabase models store is not configured");
		}

		const user = await this.upsertUser(input.walletAddress, input.chainId);

		const payload: Record<string, unknown> = {
			user_id: user.id,
			model_name: input.modelName,
			prompt_text: input.prompt,
			llm_model: input.llmModel,
			symbol: input.symbol,
			settings_json: input.settings ?? {},
			updated_at: new Date().toISOString(),
		};

		if (input.description !== undefined) {
			payload.description = input.description;
		}

		const { data, error } = await this.client
			.from(this.modelsTable)
			.upsert(payload, { onConflict: "user_id,model_name" })
			.select("*")
			.single();

		if (error || !data) {
			throw new Error(`Supabase upsert model failed: ${error?.message || "empty response"}`);
		}

		return this.mapModelRow(data as ModelRow);
	}

	async listModelRunsForUser(
		walletAddress: string,
		modelId: string,
		limit = 20,
	): Promise<PromptModelRunEntity[]> {
		if (!this.client) {
			return [];
		}

		const user = await this.getUserByWallet(walletAddress);
		if (!user) {
			return [];
		}

		const model = await this.getModelByIdForUser(user.id, modelId);
		if (!model) {
			return [];
		}

		const { data, error } = await this.client
			.from(this.runsTable)
			.select("*")
			.eq("user_id", user.id)
			.eq("model_id", model.id)
			.order("ended_at", { ascending: false })
			.limit(limit);

		if (error) {
			throw new Error(`Supabase list model runs failed: ${error.message}`);
		}

		return (data ?? []).map((row: unknown) => this.mapRunRow(row as RunRow));
	}

	async recordRunForModel(input: RecordRunInput): Promise<void> {
		if (!this.client) {
			return;
		}

		const user = await this.upsertUser(input.walletAddress, input.chainId);
		let model = input.modelId
			? await this.getModelByIdForUser(user.id, input.modelId)
			: null;

		if (!model) {
			const upserted = await this.upsertModelForUser({
				walletAddress: input.walletAddress,
				chainId: input.chainId,
				modelName: input.modelName,
				prompt: input.prompt,
				llmModel: input.llmModel,
				symbol: input.symbol,
				settings: {
					cycles: input.cycles,
					intervalMs: input.intervalMs,
					source: input.source,
				},
			});

			model = await this.getModelByIdForUser(user.id, upserted.id);
		}

		if (!model) {
			throw new Error("Model not found after upsert");
		}

		const insertRunResult = await this.client
			.from(this.runsTable)
			.insert({
				run_id: input.runId,
				model_id: model.id,
				user_id: user.id,
				source: input.source,
				pnl: input.pnl,
				roi_pct: input.roiPct,
				trades_count: input.tradesCount,
				profitable_trades: input.profitableTrades,
				win_rate_pct: input.winRatePct,
				cycles: input.cycles,
				interval_ms: input.intervalMs,
				started_at: new Date(input.startedAt).toISOString(),
				ended_at: new Date(input.endedAt).toISOString(),
				meta: input.meta ?? {},
			});

		if (insertRunResult.error) {
			if (insertRunResult.error.code === "23505") {
				return;
			}

			throw new Error(`Supabase insert run failed: ${insertRunResult.error.message}`);
		}

		const currentTotalRuns = model.total_runs ?? 0;
		const nextTotalRuns = currentTotalRuns + 1;
		const currentAverageRoi = model.average_roi_pct ?? 0;
		const nextAverageRoi = ((currentAverageRoi * currentTotalRuns) + input.roiPct) / nextTotalRuns;
		const currentBestRoi = model.best_roi_pct;
		const currentWorstRoi = model.worst_roi_pct;
		const currentBestPnl = model.best_pnl;

		const nextBestRoi = currentBestRoi === null ? input.roiPct : Math.max(currentBestRoi, input.roiPct);
		const nextBestPnl = currentBestPnl === null ? input.pnl : Math.max(currentBestPnl, input.pnl);
		const nextWorstRoi = currentWorstRoi === null ? input.roiPct : Math.min(currentWorstRoi, input.roiPct);

		const nextTotalTrades = (model.total_trades ?? 0) + input.tradesCount;
		const nextProfitableTrades = (model.profitable_trades ?? 0) + input.profitableTrades;

		const { error: updateError } = await this.client
			.from(this.modelsTable)
			.update({
				prompt_text: input.prompt,
				llm_model: input.llmModel,
				symbol: input.symbol,
				total_runs: nextTotalRuns,
				total_trades: nextTotalTrades,
				profitable_trades: nextProfitableTrades,
				average_roi_pct: nextAverageRoi,
				best_roi_pct: nextBestRoi,
				worst_roi_pct: nextWorstRoi,
				best_pnl: nextBestPnl,
				last_pnl: input.pnl,
				last_roi_pct: input.roiPct,
				last_result_at: new Date(input.endedAt).toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", model.id)
			.eq("user_id", user.id);

		if (updateError) {
			throw new Error(`Supabase update model aggregate failed: ${updateError.message}`);
		}
	}

	private async upsertUser(walletAddress: string, chainId: number): Promise<UserRow> {
		if (!this.client) {
			throw new Error("Supabase models store is not configured");
		}

		const normalizedWallet = walletAddress.toLowerCase();

		const { data, error } = await this.client
			.from(this.usersTable)
			.upsert({
				wallet_address: normalizedWallet,
				chain_id: chainId,
				last_login_at: new Date().toISOString(),
			}, { onConflict: "wallet_address" })
			.select("*")
			.single();

		if (error || !data) {
			throw new Error(`Supabase upsert user failed: ${error?.message || "empty response"}`);
		}

		return data as UserRow;
	}

	public async getUserByWallet(walletAddress: string): Promise<UserRow | null> {
		if (!this.client) {
			return null;
		}

		const normalizedWallet = walletAddress.toLowerCase();

		const { data, error } = await this.client
			.from(this.usersTable)
			.select("*")
			.eq("wallet_address", normalizedWallet)
			.maybeSingle();

		if (error) {
			throw new Error(`Supabase read user failed: ${error.message}`);
		}

		return (data as UserRow | null) ?? null;
	}

	public async getModelByIdForUser(userId: string, modelId: string): Promise<ModelRow | null> {
		if (!this.client) {
			return null;
		}

		const { data, error } = await this.client
			.from(this.modelsTable)
			.select("*")
			.eq("user_id", userId)
			.eq("id", modelId)
			.maybeSingle();

		if (error) {
			throw new Error(`Supabase read model failed: ${error.message}`);
		}

		return (data as ModelRow | null) ?? null;
	}

	async listRandomModels(limit = 6): Promise<(PromptModelEntity & { walletAddress?: string; })[]> {
		if (!this.client) {
			return [];
		}

		// Fetch latest 50 active models
		const { data: models, error } = await this.client
			.from(this.modelsTable)
			.select("*")
			.not("last_pnl", "is", null) // Only models with runs
			.order("updated_at", { ascending: false })
			.limit(50);

		if (error) {
			console.warn("Failed to list random models:", error.message);
			return [];
		}

		if (!models || models.length === 0) {
			return [];
		}

		// Shuffle and slice
		const shuffled = [...models].sort(() => 0.5 - Math.random());
		const selected = shuffled.slice(0, limit);

		// Fetch users
		const userIds = [...new Set(selected.map((m: any) => m.user_id))];
		const { data: users } = await this.client
			.from(this.usersTable)
			.select("id, wallet_address")
			.in("id", userIds);

		const userMap = new Map((users ?? []).map((u: any) => [u.id, u.wallet_address]));

		return selected.map((row: any) => ({
			...this.mapModelRow(row as ModelRow),
			walletAddress: userMap.get(row.user_id),
		}));
	}

	private mapModelRow(row: ModelRow): PromptModelEntity {
		return {
			id: row.id,
			modelName: row.model_name,
			description: row.description ?? '',
			prompt: row.prompt_text,
			llmModel: row.llm_model,
			symbol: row.symbol,
			settings: row.settings_json ?? {},
			totalRuns: row.total_runs ?? 0,
			totalTrades: row.total_trades ?? 0,
			profitableTrades: row.profitable_trades ?? 0,
			averageRoiPct: row.average_roi_pct ?? 0,
			bestRoiPct: row.best_roi_pct,
			worstRoiPct: row.worst_roi_pct,
			bestPnl: row.best_pnl,
			lastPnl: row.last_pnl,
			lastRoiPct: row.last_roi_pct,
			lastResultAt: row.last_result_at,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}

	private mapRunRow(row: RunRow): PromptModelRunEntity {
		return {
			id: row.id,
			runId: row.run_id,
			source: row.source,
			pnl: row.pnl,
			roiPct: row.roi_pct,
			tradesCount: row.trades_count,
			profitableTrades: row.profitable_trades,
			winRatePct: row.win_rate_pct,
			cycles: row.cycles,
			intervalMs: row.interval_ms,
			startedAt: row.started_at,
			endedAt: row.ended_at,
			createdAt: row.created_at,
			meta: row.meta ?? {},
		};
	}
}

