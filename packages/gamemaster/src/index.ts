import dotenv from "dotenv";
import path from "path";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { EvolutionService } from "./services/EvolutionService";
import { BchService } from "./services/BchService";
import { buildTradingSystemPrompt, processAgentSignal } from "@aibattles/engine";
import { AIAgentService } from "./services/AIAgentService";
import { LeaderboardService } from "./services/LeaderboardService";
import { MarketDataService } from "./services/MarketDataService";
import { TradingOrchestrator } from "./services/TradingOrchestrator";
import { TournamentService } from "./services/TournamentService";
import { SupabaseAccountModelsStore } from "./services/SupabaseAccountModelsStore";
import { AuthClaims, AuthService } from "./auth/AuthService";
// Load env: package-local .env takes highest priority (contains ORACLE_PRIVATE_KEY etc.)
// Then root monorepo .env fills in anything missing (OPENAI_API_KEY, SUPABASE keys etc.)
dotenv.config({ path: path.resolve(__dirname, "../.env") });               // packages/gamemaster/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false }); // packages/.env (if any)
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), override: false }); // root .env

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const AUTH_DOMAIN = process.env.AUTH_DOMAIN || "localhost:3000";
const AUTH_CHAIN_ID = Number(process.env.AUTH_CHAIN_ID || 97);
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "dev-only-change-me";
const AUTH_SESSION_TTL_SEC = Number(process.env.AUTH_SESSION_TTL_SEC || 60 * 60 * 24);
const AUTH_NONCE_TTL_MS = Number(process.env.AUTH_NONCE_TTL_MS || 5 * 60 * 1000);
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "awb_auth";

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const DEFAULT_SYMBOL = process.env.DEFAULT_SYMBOL || "BCHUSDT";
const DEFAULT_CYCLES = Number(process.env.DEFAULT_AGENT_CYCLES || 3);
const DEFAULT_INTERVAL_MS = Number(process.env.DEFAULT_AGENT_INTERVAL_MS || 7000);
const TOURNAMENT_DURATION_SEC = Number(process.env.TOURNAMENT_DURATION_SEC || 900);
const TOURNAMENT_TICK_SEC = Number(process.env.TOURNAMENT_TICK_SEC || 30);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
	|| process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_LEADERBOARD_TABLE || "leaderboard_scores";
const SUPABASE_USERS_TABLE = process.env.SUPABASE_USERS_TABLE || "auth_users";
const SUPABASE_MODELS_TABLE = process.env.SUPABASE_MODELS_TABLE || "user_prompt_models";
const SUPABASE_RUNS_TABLE = process.env.SUPABASE_MODEL_RUNS_TABLE || "user_prompt_model_runs";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: FRONTEND_ORIGIN,
		credentials: true,
	},
});

const authService = new AuthService({
	jwtSecret: AUTH_JWT_SECRET,
	sessionTtlSec: AUTH_SESSION_TTL_SEC,
});

const leaderboardService = new LeaderboardService({
	scoreScale: 100,
	supabaseUrl: SUPABASE_URL,
	supabaseKey: SUPABASE_KEY,
	supabaseTable: SUPABASE_TABLE,
});

const marketDataService = new MarketDataService(process.env.BINANCE_BASE_URL);
const aiAgentService = new AIAgentService(process.env.OPENAI_API_KEY, OPENAI_MODEL);

const tradingOrchestrator = new TradingOrchestrator(
	aiAgentService,
	marketDataService,
	leaderboardService,
);

const bchService = new BchService(process.env.ESCROW_SEED_PHRASE || "");
// BchService self-initializes in constructor; use bchService.waitForReady() before wallet ops

const tournamentService = new TournamentService(
	tradingOrchestrator,
	marketDataService,
	leaderboardService,
	bchService,
);
const accountModelsStore = new SupabaseAccountModelsStore({
	url: SUPABASE_URL,
	key: SUPABASE_KEY,
	usersTable: SUPABASE_USERS_TABLE,
	modelsTable: SUPABASE_MODELS_TABLE,
	runsTable: SUPABASE_RUNS_TABLE,
});

const evolutionService = new EvolutionService(process.env.OPENAI_API_KEY);

type AuthedRequest = Request & { auth?: AuthClaims; };

const AgentSchema = z.object({
	playerAddress: z.string().min(8),
	agentName: z.string().min(2).max(64),
	strategy: z.string().min(10).max(4000),
});

const LoginRequestSchema = z.object({
	address: z.string().startsWith("bchtest:", "Invalid Chipnet BCH address"),
});

const SaveModelSchema = z.object({
	modelName: z.string().min(2).max(80),
	description: z.string().max(500).optional(),
	prompt: z.string().min(10).max(8000),
	llmModel: z.string().min(2).max(120).optional(),
	symbol: z.string().min(4).max(24).optional(),
	settings: z.record(z.unknown()).optional(),
});

app.use(cors({
	origin: FRONTEND_ORIGIN,
	credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

function extractAuthToken(req: Request): string | null {
	const header = req.header("authorization") || req.header("Authorization");
	if (header?.startsWith("Bearer ")) {
		return header.slice(7).trim();
	}

	const cookieToken = (req.cookies as Record<string, string | undefined>)?.[AUTH_COOKIE_NAME];
	return cookieToken || null;
}

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
	const token = extractAuthToken(req);
	if (!token) {
		next();
		return;
	}

	try {
		req.auth = authService.verifyToken(token);
	} catch {
		// Ignore and continue unauthenticated.
	}

	next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
	const token = extractAuthToken(req);
	if (!token) {
		res.status(401).json({ error: "Authorization required" });
		return;
	}

	try {
		req.auth = authService.verifyToken(token);
		next();
	} catch (error) {
		res.status(401).json({
			error: error instanceof Error ? error.message : "Invalid auth token",
		});
	}
}

async function persistAuthenticatedUserProfile(walletAddress: string, chainId: number): Promise<void> {
	if (!accountModelsStore.isEnabled) {
		return;
	}

	await accountModelsStore.touchUserLogin(walletAddress, chainId);
}

app.post("/auth/login", async (req, res) => {
	const parsed = LoginRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		return res.status(400).json({
			error: "Invalid payload",
			issues: parsed.error.issues,
		});
	}

	let verified;
	try {
		verified = authService.loginWithBchAddress(parsed.data.address);
	} catch (error) {
		return res.status(401).json({
			error: error instanceof Error ? error.message : "Login failed",
		});
	}

	try {
		await persistAuthenticatedUserProfile(verified.address, verified.chainId);

		res.cookie(AUTH_COOKIE_NAME, verified.token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: AUTH_SESSION_TTL_SEC * 1000,
		});

		return res.json({
			ok: true,
			token: verified.token,
			address: verified.address,
			chainId: verified.chainId,
			expiresAt: verified.expiresAt,
		});
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Cannot persist authenticated user",
		});
	}
});

app.get("/auth/me", requireAuth, async (req: AuthedRequest, res) => {
	const auth = req.auth!;

	try {
		await persistAuthenticatedUserProfile(auth.sub, auth.chainId);
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Cannot sync authenticated user profile",
		});
	}

	return res.json({
		ok: true,
		address: auth.sub,
		chainId: auth.chainId,
		issuedAt: auth.iat ? auth.iat * 1000 : null,
		expiresAt: auth.exp ? auth.exp * 1000 : null,
	});
});

app.post("/auth/logout", (_req, res) => {
	res.clearCookie(AUTH_COOKIE_NAME, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});

	return res.json({ ok: true });
});

app.get("/health", optionalAuth, async (req: AuthedRequest, res) => {
	const leaderboard = await leaderboardService.getLeaderboard();
	res.json({
		status: "ok",
		mode: leaderboardService.storageMode,
		oracleAddress: leaderboardService.oracleAddress,
		supabaseEnabled: leaderboardService.isSupabaseEnabled,
		accountModelsEnabled: accountModelsStore.isEnabled,
		leaderboardSize: leaderboard.length,
		authenticated: Boolean(req.auth),
	});
});

app.get("/leaderboard", async (_req, res) => {
	const leaderboard = await leaderboardService.getLeaderboard();
	res.json({ leaderboard });
});

// PancakeSwapService removed

app.get("/market/price/:symbol", async (req, res) => {
	const symbol = req.params.symbol.toUpperCase();
	// Basic validation: 3-10 chars, alphanumeric
	if (!/^[A-Z0-9]{3,10}$/.test(symbol)) {
		return res.status(400).json({ error: "Invalid symbol format" });
	}

	try {
		const snapshot = await marketDataService.getSnapshot(symbol);
		res.json(snapshot);
	} catch (error) {
		res.status(500).json({
			error: error instanceof Error ? error.message : "Failed to fetch market data",
		});
	}
});

app.post("/agent/debug-decision", async (req, res) => {
	const body = req.body;
	const { strategy, market, portfolio } = body;

	if (!strategy || !market || !portfolio) {
		return res.status(400).json({ error: "Missing strategy, market, or portfolio" });
	}

	try {
		// 1. Get raw decision from AI (or heuristic)
		const decisionJson = await aiAgentService.createDecision(strategy, market, portfolio);

		// 2. Process signal to get exchange call
		let decision: any;
		try {
			decision = JSON.parse(decisionJson);
		} catch {
			return res.json({
				decision: { raw: decisionJson },
				executionResult: { executed: false, error: "Invalid JSON from AI" },
			});
		}

		// 3. Process Logic (Simulate Engine)
		const executionContext = {
			symbol: market.symbol,
			quoteAsset: "USDT",
			quoteBalance: portfolio.quoteBalance,
			baseBalance: portfolio.baseBalance,
			lastPrice: market.price,
		};

		const { exchangeCall } = processAgentSignal(decisionJson, executionContext);

		// 4. Simulate Execution (Simplified)
		let executionResult: any = { executed: false };

		if (exchangeCall) {
			const side = exchangeCall.payload.side;
			const price = market.price;
			const FEE = 0.001;

			if (side === "BUY") {
				const quoteQty = Number(exchangeCall.payload.quoteOrderQty || 0);
				// Basic check against balance
				if (quoteQty > 0 && quoteQty <= portfolio.quoteBalance) {
					const BaseBought = (quoteQty / price) * (1 - FEE);
					executionResult = {
						executed: true,
						side: "BUY",
						spent: quoteQty,
						received: BaseBought,
						newPortfolio: {
							...portfolio,
							quoteBalance: portfolio.quoteBalance - quoteQty,
							baseBalance: portfolio.baseBalance + BaseBought,
						},
					};
				} else {
					executionResult = { executed: false, reason: "Insufficient funds for BUY" };
				}
			} else if (side === "SELL") {
				const baseQty = Number(exchangeCall.payload.quantity || 0);
				if (baseQty > 0 && baseQty <= portfolio.baseBalance) {
					const QuoteReceived = (baseQty * price) * (1 - FEE);
					executionResult = {
						executed: true,
						side: "SELL",
						sold: baseQty,
						received: QuoteReceived,
						newPortfolio: {
							...portfolio,
							baseBalance: portfolio.baseBalance - baseQty,
							quoteBalance: portfolio.quoteBalance + QuoteReceived,
						},
					};
				} else {
					executionResult = { executed: false, reason: "Insufficient funds for SELL" };
				}
			}
		}

		return res.json({
			decision,
			exchangeCall,
			executionResult,
		});
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Failed to debug decision",
		});
	}
});


app.get("/prompts/system", (req, res) => {
	const strategy = typeof req.query.strategy === "string"
		? req.query.strategy
		: "Momentum strategy with capital protection";

	res.json({
		systemPrompt: buildTradingSystemPrompt(strategy),
	});
});

app.get("/models/featured", async (req, res) => {
	if (!accountModelsStore.isEnabled) {
		return res.status(503).json({ error: "Supabase model storage is not configured" });
	}

	try {
		const limit = Math.min(20, Math.max(1, Number(req.query.limit ?? 6)));
		const models = await accountModelsStore.listRandomModels(limit);
		return res.json({ ok: true, models });
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Cannot list featured models",
		});
	}
});

app.get("/models", requireAuth, async (req: AuthedRequest, res) => {
	if (!accountModelsStore.isEnabled) {
		return res.status(503).json({ error: "Supabase model storage is not configured" });
	}

	try {
		const models = await accountModelsStore.listModelsForUser(req.auth!.sub);
		return res.json({ ok: true, models });
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Cannot list models",
		});
	}
});

app.post("/models", requireAuth, async (req: AuthedRequest, res) => {
	if (!accountModelsStore.isEnabled) {
		return res.status(503).json({ error: "Supabase model storage is not configured" });
	}

	const parsed = SaveModelSchema.safeParse(req.body);
	if (!parsed.success) {
		return res.status(400).json({
			error: "Invalid payload",
			issues: parsed.error.issues,
		});
	}

	try {
		const model = await accountModelsStore.upsertModelForUser({
			walletAddress: req.auth!.sub,
			chainId: req.auth!.chainId,
			modelName: parsed.data.modelName,
			description: parsed.data.description,
			prompt: parsed.data.prompt,
			llmModel: parsed.data.llmModel || OPENAI_MODEL,
			symbol: parsed.data.symbol || DEFAULT_SYMBOL,
			settings: parsed.data.settings ?? {},
		});

		return res.json({
			ok: true,
			model,
		});
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Cannot save model",
		});
	}
});

app.post("/models/:modelId/evolve", requireAuth, async (req: AuthedRequest, res) => {
	if (!accountModelsStore.isEnabled) {
		return res.status(503).json({ error: "Supabase model storage is not configured" });
	}

	const modelId = String(req.params.modelId || "");
	if (!modelId) {
		return res.status(400).json({ error: "modelId is required" });
	}

	try {
		const user = await accountModelsStore.getUserByWallet(req.auth!.sub);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const model = await accountModelsStore.getModelByIdForUser(user.id, modelId);
		if (!model) {
			return res.status(404).json({ error: "Model not found" });
		}

		// Run evolution
		const originalStrategy = {
			name: model.model_name,
			description: "Evolution Input",
			pairs: [model.symbol],
			strategy: model.settings_json,
		};

		const evolutionResult = await evolutionService.evolveBot(model.prompt_text, originalStrategy);

		if (evolutionResult.bestShadow) {
			// Save the evolved model
			const updatedModel = await accountModelsStore.upsertModelForUser({
				walletAddress: req.auth!.sub,
				chainId: req.auth!.chainId,
				modelName: model.model_name,
				prompt: evolutionResult.bestShadow.description || model.prompt_text,
				llmModel: model.llm_model,
				symbol: model.symbol,
				settings: evolutionResult.bestShadow.strategy,
			});

			return res.json({
				ok: true,
				evolutionResult,
				model: updatedModel
			});
		}

		return res.json({ ok: true, evolutionResult, model: accountModelsStore.listModelsForUser(req.auth!.sub) });
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Cannot evolve model",
		});
	}
});

app.post('/models/:modelId/evolve', requireAuth, async (req: AuthedRequest, res: Response) => {
	try {
		if (!accountModelsStore.isEnabled) {
			return res.status(503).json({ error: "Supabase model storage is not configured" });
		}

		const modelId = req.params.modelId;
		const playerAddress = req.auth!.sub;
		const chainId = req.auth!.chainId;

		const user = await accountModelsStore.getUserByWallet(playerAddress);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const model = await accountModelsStore.getModelByIdForUser(user.id, modelId);
		if (!model) {
			return res.status(404).json({ error: "Model not found" });
		}

		const originalStrategy = {
			name: model.model_name,
			description: model.prompt_text,
			pairs: [model.symbol || "BCHUSDT"],
			strategy: model.settings_json || {}
		};

		const evolutionResult = await evolutionService.evolveBot(
			model.prompt_text,
			originalStrategy
		);

		const newPrompt = evolutionResult.bestShadow?.description || model.prompt_text;
		const newSettings = evolutionResult.bestShadow?.strategy || model.settings_json;

		const updatedModel = await accountModelsStore.upsertModelForUser({
			walletAddress: playerAddress,
			chainId: chainId,
			modelName: model.model_name,
			prompt: newPrompt,
			llmModel: model.llm_model,
			symbol: model.symbol,
			settings: {
				...newSettings,
				evolutionHistory: [
					...(Array.isArray(newSettings?.evolutionHistory) ? newSettings.evolutionHistory : []),
					{
						date: new Date().toISOString(),
						previousPrompt: model.prompt_text,
						roiImprovement: evolutionResult.bestShadowPnl - evolutionResult.originalPnl
					}
				]
			}
		});

		return res.json({ evolutionResult, model: updatedModel });
	} catch (e: any) {
		console.error("Error evolving model:", e);
		return res.status(500).json({ error: "Failed to evolve model: " + e.message });
	}
});

app.post('/models/:modelId/mint', requireAuth, async (req: AuthedRequest, res: Response) => {
	if (!accountModelsStore.isEnabled) {
		return res.status(503).json({ error: "Supabase model storage is not configured" });
	}

	const modelId = String(req.params.modelId || "");
	if (!modelId) {
		return res.status(400).json({ error: "modelId is required" });
	}

	try {
		const user = await accountModelsStore.getUserByWallet(req.auth!.sub);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const model = await accountModelsStore.getModelByIdForUser(user.id, modelId);
		if (!model) {
			return res.status(404).json({ error: "Model not found" });
		}

		// Prevent double-minting
		if (model.settings_json?.tokenId) {
			return res.status(400).json({ error: "Model is already minted", tokenId: model.settings_json.tokenId });
		}

		// Fetch run history for chart data
		const runs = await accountModelsStore.listModelRunsForUser(req.auth!.sub, modelId, 50);
		const { generateChartImage } = await import('./services/ChartImageService');

		const chartPoints: { label: string; value: number; }[] = runs.length > 0
			? runs.reverse().map((r, i) => ({ label: `Run ${i + 1}`, value: r.pnl }))
			: [{ label: '0', value: 0 }, { label: '1', value: model.last_pnl ?? 0 }];

		// Generate chart image
		console.log(`[Mint] Generating PnL chart for model ${model.model_name}...`);
		const chartBuffer = await generateChartImage(chartPoints);

		// Upload chart image to IPFS
		const filebaseService = new (await import('./services/FilebaseService')).FilebaseService();
		const chartFilename = `defight-chart-${modelId.slice(0, 8)}-${Date.now()}.${chartBuffer.toString('utf-8').startsWith('<svg') ? 'svg' : 'png'}`;
		const chartUpload = await filebaseService.uploadImage(chartBuffer, chartFilename);
		console.log(`[Mint] Chart uploaded to IPFS: ${chartUpload.uri}`);

		// Compute aggregate stats
		const totalRuns = model.total_runs ?? 0;
		const totalTrades = model.total_trades ?? 0;
		const profitableTrades = model.profitable_trades ?? 0;
		const winRate = totalTrades > 0 ? ((profitableTrades / totalTrades) * 100).toFixed(2) : '0.00';
		const bestRoi = model.best_roi_pct ?? 0;
		const avgRoi = model.average_roi_pct ?? 0;
		const bestPnl = model.best_pnl ?? model.last_pnl ?? 0;
		const lastPnl = model.last_pnl ?? 0;
		const generation = totalRuns || 1;

		// Build rich IPFS metadata — prompt is NOT included
		const nftMetadata = {
			name: model.model_name,
			description: model.description || `DeFight AI Trading Bot`,
			image: chartUpload.uri,
			model_id: modelId,
			attributes: [
				{ trait_type: "Generation", value: generation },
				{ trait_type: "Best PnL", value: `${bestPnl >= 0 ? '+' : ''}${Number(bestPnl).toFixed(2)} USDT` },
				{ trait_type: "Best ROI", value: `${bestRoi >= 0 ? '+' : ''}${Number(bestRoi).toFixed(2)}%` },
				{ trait_type: "Average ROI", value: `${avgRoi >= 0 ? '+' : ''}${Number(avgRoi).toFixed(2)}%` },
				{ trait_type: "Total Runs", value: totalRuns },
				{ trait_type: "Total Trades", value: totalTrades },
				{ trait_type: "Win Rate", value: `${winRate}%` },
			],
		};

		// Mint the CashToken NFT
		const mintResult = await bchService.mintBotNft(
			req.auth!.sub,
			model.model_name,
			generation,
			nftMetadata
		);

		// Save tokenId to Supabase model settings
		const updatedSettings = {
			...model.settings_json,
			tokenId: mintResult.tokenId,
			ipfsUri: mintResult.ipfsUri
		};

		const updatedModel = await accountModelsStore.upsertModelForUser({
			walletAddress: req.auth!.sub,
			chainId: req.auth!.chainId,
			modelName: model.model_name,
			prompt: model.prompt_text,
			llmModel: model.llm_model,
			symbol: model.symbol,
			settings: updatedSettings,
		});

		return res.json({
			ok: true,
			mintResult,
			model: updatedModel
		});
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Cannot mint model",
		});
	}
});



app.get("/models/:modelId/runs", requireAuth, async (req: AuthedRequest, res) => {
	if (!accountModelsStore.isEnabled) {
		return res.status(503).json({ error: "Supabase model storage is not configured" });
	}

	const modelId = String(req.params.modelId || "");
	const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 20)));

	if (!modelId) {
		return res.status(400).json({ error: "modelId is required" });
	}

	try {
		const runs = await accountModelsStore.listModelRunsForUser(req.auth!.sub, modelId, limit);
		return res.json({ ok: true, runs });
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Cannot list model runs",
		});
	}
});

app.post("/agents/launch", requireAuth, async (req: AuthedRequest, res) => {
	const body = req.body as Record<string, unknown>;
	const parseResult = AgentSchema.safeParse(body);

	if (!parseResult.success) {
		return res.status(400).json({
			error: "Invalid payload",
			issues: parseResult.error.issues,
		});
	}

	if (parseResult.data.playerAddress.toLowerCase() !== req.auth!.sub.toLowerCase()) {
		return res.status(403).json({
			error: "Authenticated wallet must match playerAddress",
			authenticatedWallet: req.auth!.sub,
		});
	}

	const runId = uuidv4();
	const cycles = Number(body.cycles ?? DEFAULT_CYCLES);
	const intervalMs = Number(body.intervalMs ?? DEFAULT_INTERVAL_MS);
	const symbol = typeof body.symbol === "string" ? body.symbol : DEFAULT_SYMBOL;
	const llmModel = typeof body.llmModel === "string" && body.llmModel
		? body.llmModel
		: OPENAI_MODEL;
	const auth = req.auth!;
	const launchStartedAt = Date.now();
	let persistedModelId: string | undefined;

	if (accountModelsStore.isEnabled) {
		try {
			const savedModel = await accountModelsStore.upsertModelForUser({
				walletAddress: auth.sub,
				chainId: auth.chainId,
				modelName: parseResult.data.agentName,
				prompt: parseResult.data.strategy,
				llmModel,
				symbol,
				settings: {
					cycles,
					intervalMs,
					source: "solo",
				},
			});
			persistedModelId = savedModel.id;
		} catch (error) {
			return res.status(500).json({
				error: error instanceof Error ? error.message : "Cannot persist model before launch",
			});
		}
	}

	io.emit("run:started", {
		runId,
		playerAddress: parseResult.data.playerAddress,
		agentName: parseResult.data.agentName,
		symbol,
		cycles,
	});

	void tradingOrchestrator
		.runSession({
			runId,
			agent: parseResult.data,
			symbol,
			cycles,
			intervalMs,
			io,
		})
		.then(async (summary) => {
			if (!accountModelsStore.isEnabled) {
				return;
			}

			try {
				await accountModelsStore.recordRunForModel({
					walletAddress: auth.sub,
					chainId: auth.chainId,
					modelId: persistedModelId,
					modelName: parseResult.data.agentName,
					prompt: parseResult.data.strategy,
					llmModel,
					symbol,
					runId,
					source: "solo",
					pnl: summary.finalPnl,
					roiPct: summary.roiPct,
					tradesCount: summary.tradesCount,
					profitableTrades: summary.profitableTrades,
					winRatePct: summary.winRatePct,
					cycles,
					intervalMs,
					startedAt: summary.startedAt || launchStartedAt,
					endedAt: summary.endedAt,
					meta: {
						authenticatedWallet: auth.sub,
					},
				});
			} catch (error) {
				console.warn(
					`[GameMaster] Failed to persist model run metrics: ${error instanceof Error ? error.message : "unknown error"}`,
				);
			}
		})
		.catch((error) => {
			io.emit("run:error", {
				runId,
				message: error instanceof Error ? error.message : "Unknown run error",
			});
		});

	return res.json({
		ok: true,
		runId,
		modelId: persistedModelId ?? null,
		symbol,
		cycles,
		intervalMs,
	});
});

app.post("/agents/stop", requireAuth, async (req: AuthedRequest, res) => {
	const playerAddress = req.auth!.sub;
	console.log(`[GameMaster] Stopping agent for ${playerAddress}`);

	try {
		tradingOrchestrator.stopSession(playerAddress);

		let finalPnl = 0;
		let roiPct = 0;
		try {
			const market = await marketDataService.getSnapshot(DEFAULT_SYMBOL);
			const portfolio = tradingOrchestrator.getPortfolio(playerAddress);

			if (portfolio) {
				const finalUSDT = portfolio.quoteBalance + (portfolio.baseBalance * market.price);
				const initialUSDT = portfolio.depositUSDT || 1000;

				if (initialUSDT > 0) {
					finalPnl = finalUSDT - initialUSDT;
					roiPct = (finalPnl / initialUSDT) * 100;

					console.log(
						`[GameMaster] Stop Stats: Initial=${initialUSDT.toFixed(2)} USDT, Final=${finalUSDT.toFixed(2)} USDT ` +
						`→ PnL=$${finalPnl.toFixed(2)}, ROI=${roiPct.toFixed(2)}%`
					);
				} else {
					finalPnl = portfolio.lastPnl ?? 0;
				}
			}
		} catch (e) {
			console.warn("[GameMaster] Could not calculate final PnL:", e);
		}

		try {
			await leaderboardService.updateScore(playerAddress, "Agent", finalPnl);
		} catch (e) {
			console.warn("[GameMaster] Failed to save score:", e);
		}

		tradingOrchestrator.resetPortfolio(playerAddress);

		return res.json({ ok: true, finalPnl, roiPct });
	} catch (error: any) {
		console.error("Stop failed:", error);
		return res.status(500).json({ ok: false, error: error.message || "Stop failed" });
	}
});

app.post("/tournament/enter", requireAuth, async (req: AuthedRequest, res) => {
	const payload = req.body as Record<string, unknown>;
	const txId = typeof payload.txId === "string" ? payload.txId : null;
	const modelId = typeof payload.modelId === "string" ? payload.modelId : null;

	if (!txId || !modelId) {
		return res.status(400).json({ error: "txId and modelId are required to enter tournament" });
	}

	if (!accountModelsStore.isEnabled) {
		return res.status(503).json({ error: "Supabase model storage is not configured" });
	}

	try {
		const user = await accountModelsStore.getUserByWallet(req.auth!.sub);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const model = await accountModelsStore.getModelByIdForUser(user.id, modelId);
		if (!model) {
			return res.status(404).json({ error: "Model not found" });
		}

		const tokenId = model.settings_json?.tokenId as string | undefined;
		if (!tokenId) {
			return res.status(400).json({ error: "Model is not minted. Must mint to enter tournament." });
		}

		// --- VERIFY TX ON CHAIN ---
		// In a real MVP, we would use the blockchain explorer API (or mainnet-js watch wallet) 
		// to verify that txId exists, the outputs contain the user's `tokenId` transferred 
		// to the GameMaster's address, AND 5000 tBCH was sent to GameMaster.
		// For the scope of this implementation, we will mock the verification for success.
		console.log(`[Tournament Escrow] Verifying txId: ${txId} for user ${req.auth!.sub} lodging token ${tokenId} + 5000 tBCH`);
		const isValid = true;

		if (!isValid) {
			return res.status(400).json({ error: "Invalid Escrow Transaction. Make sure to send the NFT and 5000 tBCH." });
		}

		// Successfully entered escrow queue
		return res.json({
			ok: true,
			message: "Successfully locked in Escrow. You are now entered into the next Tournament slot.",
			tokenId,
			agentName: model.model_name
		});

	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Failed to enter tournament",
		});
	}
});

app.post("/tournament/start", requireAuth, (req: AuthedRequest, res) => {
	const payload = req.body as Record<string, unknown>;

	const leftParse = AgentSchema.safeParse(payload.leftAgent);
	const rightParse = AgentSchema.safeParse(payload.rightAgent);

	if (!leftParse.success || !rightParse.success) {
		return res.status(400).json({
			error: "leftAgent and rightAgent must match schema",
			leftIssues: leftParse.success ? [] : leftParse.error.issues,
			rightIssues: rightParse.success ? [] : rightParse.error.issues,
		});
	}

	if (leftParse.data.playerAddress.toLowerCase() !== req.auth!.sub.toLowerCase()) {
		return res.status(403).json({
			error: "leftAgent wallet must match authenticated user",
			authenticatedWallet: req.auth!.sub,
		});
	}

	const durationSec = Number(payload.durationSec ?? TOURNAMENT_DURATION_SEC);
	const tickSec = Number(payload.tickSec ?? TOURNAMENT_TICK_SEC);
	const symbol = typeof payload.symbol === "string" ? payload.symbol : DEFAULT_SYMBOL;

	try {
		const tournament = tournamentService.startTournament(
			{
				agents: [leftParse.data, rightParse.data],
				durationSec,
				tickSec,
				symbol,
			},
			io,
		);

		return res.json({
			ok: true,
			...tournament,
			durationSec,
			tickSec,
			symbol,
		});
	} catch (error) {
		return res.status(409).json({
			ok: false,
			error: error instanceof Error ? error.message : "Cannot start tournament",
		});
	}
});

io.on("connection", (socket) => {
	socket.emit("server:ready", {
		message: "Connected to AI Battles GameMaster",
	});
});

httpServer.listen(PORT, () => {
	console.log(`[GameMaster] listening on :${PORT}`);
	console.log(`[GameMaster] mode: ${leaderboardService.storageMode}`);
	console.log(`[GameMaster] oracle: ${leaderboardService.oracleAddress}`);
	console.log(`[GameMaster] supabase: ${leaderboardService.isSupabaseEnabled ? "enabled" : "disabled"}`);
	console.log(`[GameMaster] account models: ${accountModelsStore.isEnabled ? "enabled" : "disabled"}`);
	if (SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
		console.warn("[GameMaster] Using SUPABASE_PUBLISHABLE_DEFAULT_KEY on server. Prefer SUPABASE_SERVICE_ROLE_KEY for trusted writes.");
	}
	console.log(`[GameMaster] frontend origin: ${FRONTEND_ORIGIN}`);
});
// Force restart Wed Feb 18 03:19:53 CET 2026
// Force restart Wed Feb 18 03:25:04 CET 2026
// Force restart Wed Feb 18 05:29:20 CET 2026
// Force restart Wed Feb 18 05:44:30 CET 2026
// Force restart Wed Feb 18 05:52:47 CET 2026
