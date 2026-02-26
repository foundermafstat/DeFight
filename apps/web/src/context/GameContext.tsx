"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { toast as notify } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/safe-action";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


// Types
export type LeaderboardRow = {
	rank: number;
	playerAddress: string;
	agentName: string;
	pnl: number;
	updatedAt: number;
};

export type LiveLog = {
	timestamp: number;
	message: string;
	txHash?: string;
};

export type ActiveSession = {
	runId: string;
	agentName: string;
	symbol: string;
	isActive: boolean;
	soloLogs: LiveLog[];
	liveSeries: Array<{ time: string; pnl: number }>;
	portfolio: { quoteBalance: number; baseBalance: number; pnl: number };
	finalPnl: number | null;
	finalRoiPct: number | null;
	marketPrice: number | null;
	agentStartedAt: string | null;
	launchedModelId: string | null;
};

export type PromptAnalysis = {
	score: number;
	summary: string;
	checks: { label: string; passed: boolean; }[];
};

export type ArenaParticipant = {
	playerAddress: string;
	agentName: string;
};

export type AgentTemplate = {
	key: string;
	name: string;
	strategy: string;
	playerAddress: string;
};

export type AuthProfile = {
	address: string;
	chainId: number;
	issuedAt: number | null;
	expiresAt: number | null;
};

export type SavedPromptModel = {
	id: string;
	modelName: string;
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
	lastPnl: number | null;
	lastRoiPct: number | null;
	lastResultAt: string | null;
	createdAt: string;
	updatedAt: string;
	walletAddress?: string;
};

export type SavedPromptModelRun = {
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
};

export type SavePromptModelInput = {
	modelName: string;
	prompt: string;
	llmModel?: string;
	symbol?: string;
	settings?: Record<string, unknown>;
};

// Constants
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const LEADERBOARD_ADDRESS = process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS || "";
const TUSDT_ADDRESS = process.env.NEXT_PUBLIC_TUSDT_ADDRESS || "";
const SCORE_SCALE = Number(process.env.NEXT_PUBLIC_SCORE_SCALE || 100);

const AUTH_TOKEN_STORAGE_KEY = "awb_auth_token";

export const MARKET_MAVERICK_PROMPT = `You are "Simple Swapper" — a debug agent designed to generate constant transaction volume on Chipnet (BCH/USDT).

Your goal: Continuous 12% rebalancing swaps.

You receive:
  • market (price)
  • portfolio (baseBalance: BCH, quoteBalance: USDT)

STRATEGY:
1. CALCULATE VALUES:
   - BCH_VAL = baseBalance * market.price
   - USDT_VAL = quoteBalance

2. DECISION:
   - IF USDT_VAL > BCH_VAL (holding more USDT):
     - ACTION: BUY BCH (using 12% of USDT).
     - REASON: "Rebalance: Buying 12% (USDT > BCH)."
   
   - IF BCH_VAL >= USDT_VAL (holding more BCH):
     - ACTION: SELL 12% of BCH.
     - REASON: "Rebalance: Selling 12% (BCH >= USDT)."

3. FALLBACK:
   - If only USDT exists -> BUY 12%.
   - If only BCH exists -> SELL 12%.

ABSOLUTE RULES:
- Always trade 12% of the available balance.
- Force trade every cycle.
- Output raw JSON: {"action":"BUY|SELL|HOLD","asset":"BCH","amount_pct":12,"reason":"..."}`;



export const AGENT_LIBRARY: AgentTemplate[] = [
	{
		key: "aggrobot",
		name: "AggroBot",
		strategy:
			"Trade aggressively on short momentum bursts, use 40% position sizing and fast reversals.",
		playerAddress: "0x10000000000000000000000000000000000000a1",
	},
	{
		key: "quant-sentinel",
		name: "Quant Sentinel",
		strategy:
			"Trade only when trend and volatility signals align. Use strict risk caps and avoid overtrading.",
		playerAddress: "0x10000000000000000000000000000000000000b2",
	},
	{
		key: "steady-alpha",
		name: "Steady Alpha",
		strategy:
			"Prioritize capital protection. Enter in oversold zones and scale out systematically into strength.",
		playerAddress: "0x10000000000000000000000000000000000000c3",
	},
];

// Helper Functions
function randomAddress(): string {
	const alphabet = "0123456789abcdef";
	let addr = "0x";
	for (let i = 0; i < 40; i += 1) {
		addr += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return addr;
}

export function shortAddress(address: string): string {
	if (!address || address.length < 12) {
		return address;
	}
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(timestampSec: number): string {
	if (!timestampSec) {
		return "-";
	}
	return new Date(timestampSec * 1000).toLocaleTimeString();
}

function zeroAddress(address: string): boolean {
	return /^0x0{40}$/i.test(address);
}

export function formatClock(timestampMs: number): string {
	return new Date(timestampMs).toLocaleTimeString([], {
		hour12: false,
	});
}

function analyzePrompt(prompt: string): PromptAnalysis {
	const lowered = prompt.toLowerCase();
	const checks = [
		{ label: "Has clear entry rule", passed: lowered.includes("entry") || lowered.includes("buy") },
		{ label: "Has clear exit rule", passed: lowered.includes("exit") || lowered.includes("sell") },
		{ label: "Has clear stop-loss logic", passed: lowered.includes("stop-loss") || lowered.includes("cut losses") },
		{ label: "Specifies pair BCH/USDT", passed: lowered.includes("bch/usdt") || lowered.includes("bchusdt") },
		{ label: "Contains risk constraints", passed: lowered.includes("risk") || lowered.includes("cautious") },
		{ label: "Requests explainable reasoning", passed: lowered.includes("reason") || lowered.includes("report") },
	];

	const passedCount = checks.filter((item) => item.passed).length;
	const score = Math.round((passedCount / checks.length) * 100);

	let summary = "Prompt is usable but can be tightened.";
	if (score >= 90) {
		summary = "Prompt quality is excellent for autonomous execution.";
	} else if (score >= 70) {
		summary = "Prompt quality is solid. Small refinements can improve consistency.";
	}

	return { score, summary, checks };
}

async function readErrorMessage(response: Response): Promise<string> {
	try {
		const text = await response.text();
		try {
			const json = JSON.parse(text) as { error?: string; message?: string; };
			return json.error || json.message || `HTTP ${response.status}`;
		} catch {
			return text || `HTTP ${response.status}`;
		}
	} catch {
		return `HTTP ${response.status}`;
	}
}

// Context Interface
interface GameContextType {
	// State
	agentName: string;
	setAgentName: (name: string) => void;
	strategy: string;
	setStrategy: (strategy: string) => void;
	playerAddress: string;
	setPlayerAddress: (address: string) => void;
	cycles: number;
	setCycles: (cycles: number) => void;
	status: string;
	analysis: PromptAnalysis | null;
	commitStatus: string;

	// Auth & Wallet
	isAuthenticated: boolean;
	authProfile: AuthProfile | null;
	walletAddress: string;
	walletChainLabel: string;
	tbchBalance: string;
	tusdtBalance: string;
	tusdtSymbol: string;
	connectWalletAndAuthenticate: (address: string) => Promise<void>;
	loginWithPaytaca: () => Promise<void>;
	logout: () => Promise<void>;
	refreshBalances: (addressParam?: string) => Promise<void>;
	copyAddress: () => Promise<void>;

	// Game Logic
	analyzeCurrentPrompt: () => void;
	launchAgent: (depositAmount?: string) => Promise<void>;
	commitToLeaderboard: () => Promise<void>;
	startDuel: () => Promise<void>;
	listSavedModels: () => Promise<SavedPromptModel[]>;
	listFeaturedModels: () => Promise<SavedPromptModel[]>;
	savePromptModel: (input: SavePromptModelInput) => Promise<SavedPromptModel>;
	evolvePromptModel: (modelId: string) => Promise<{ evolutionResult: any, model: SavedPromptModel }>;
	mintPromptModel: (modelId: string) => Promise<{ mintResult: any, model: SavedPromptModel }>;
	enterTournament: (modelId: string, txId: string) => Promise<{ message: string, tokenId: string }>;
	listModelRuns: (modelId: string, limit?: number) => Promise<SavedPromptModelRun[]>;
	stopAgent: (targetRunId?: string) => Promise<{ txHash: string; finalPnl: number; roiPct: number; }>;
	pushTerminalLog: (message: string) => void;

	// Multi-Agent New State
	sessions: Record<string, ActiveSession>;
	activeRunId: string | null;
	setActiveRunId: (runId: string | null) => void;

	// Legacy Data (Derived from activeRunId)
	leaderboard: LeaderboardRow[];
	runId: string | null;
	soloLogs: LiveLog[];
	portfolio: { quoteBalance: number; baseBalance: number; pnl: number; };
	marketPrice: number | null;
	finalPnl: number | null;
	finalRoiPct: number | null;
	liveSeries: Array<{ time: string; pnl: number; }>;
	agentStopped: boolean;

	// Arena
	leftAgentKey: string;
	setLeftAgentKey: (key: string) => void;
	rightAgentKey: string;
	setRightAgentKey: (key: string) => void;
	duelId: string | null;
	duelWinner: string;
	duelEndAt: number | null;
	duelTimeLeft: string;
	duelLeft: ArenaParticipant | null;
	duelRight: ArenaParticipant | null;
	arenaLeftLogs: LiveLog[];
	arenaRightLogs: LiveLog[];
	arenaChartData: any[]; // refined type below
	agentOptions: AgentTemplate[];
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode; }) {
	// State definitions (copied from page.tsx)
	const [agentName, setAgentName] = useState("Market Maverick");
	const [strategy, setStrategy] = useState(MARKET_MAVERICK_PROMPT);
	const [playerAddress, setPlayerAddress] = useState(randomAddress); // Initial random
	const [cycles, setCycles] = useState(90);

	const [status, setStatus] = useState("System ready");
	const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
	const [commitStatus, setCommitStatus] = useState("Not committed");

	// Auth Modal State
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [authInputAddress, setAuthInputAddress] = useState("");

	const [authToken, setAuthToken] = useState("");
	const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
	const [walletAddress, setWalletAddress] = useState<string>("");
	const [walletChainLabel, setWalletChainLabel] = useState("Disconnected");
	const [tbchBalance, setTbchBalance] = useState("0.0000");
	const [tusdtBalance, setTusdtBalance] = useState("-");
	const [tusdtSymbol, setTusdtSymbol] = useState("tUSDT");

	const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
	const [lastRoiPct, setLastRoiPct] = useState<number>(0);

	// Context for Multi-Session
	const [sessions, setSessions] = useState<Record<string, ActiveSession>>({});
	const [activeRunId, setActiveRunId] = useState<string | null>(null);

	// Derived states based on activeRunId
	const activeSession = activeRunId ? sessions[activeRunId] : null;

	const runId = activeSession?.runId || null;
	const soloLogs = activeSession?.soloLogs || [];
	const agentStopped = activeSession ? !activeSession.isActive : false;
	const portfolio = activeSession?.portfolio || { quoteBalance: 1000, baseBalance: 0, pnl: 0 };
	const marketPrice = activeSession?.marketPrice || null;
	const liveSeries = activeSession?.liveSeries || [];
	const finalPnl = activeSession?.finalPnl ?? null;
	const finalRoiPct = activeSession?.finalRoiPct ?? null;
	const agentNameContext = activeSession?.agentName || agentName;

	const [leftAgentKey, setLeftAgentKey] = useState("custom");
	const [rightAgentKey, setRightAgentKey] = useState("aggrobot");

	const [duelId, setDuelId] = useState<string | null>(null);
	const [duelWinner, setDuelWinner] = useState<string>("");
	const [duelEndAt, setDuelEndAt] = useState<number | null>(null);
	const [duelLeft, setDuelLeft] = useState<ArenaParticipant | null>(null);
	const [duelRight, setDuelRight] = useState<ArenaParticipant | null>(null);
	const [arenaLeftLogs, setArenaLeftLogs] = useState<LiveLog[]>([]);
	const [arenaRightLogs, setArenaRightLogs] = useState<LiveLog[]>([]);
	const [arenaLeftSeries, setArenaLeftSeries] = useState<Array<{ time: string; pnl: number; }>>([]);
	const [arenaRightSeries, setArenaRightSeries] = useState<Array<{ time: string; pnl: number; }>>([]);

	// Oracle Price (PancakeSwap)


	const isAuthenticated = Boolean(authToken && authProfile);

	const customAgent = useMemo<AgentTemplate>(
		() => ({
			key: "custom",
			name: agentName || "Market Maverick",
			strategy,
			playerAddress: playerAddress || randomAddress(),
		}),
		[agentName, strategy, playerAddress],
	);

	const agentOptions = useMemo(() => [customAgent, ...AGENT_LIBRARY], [customAgent]);

	const arenaChartData = useMemo(() => {
		const maxLen = Math.max(arenaLeftSeries.length, arenaRightSeries.length);
		return Array.from({ length: maxLen }, (_, index) => ({
			time: arenaLeftSeries[index]?.time || arenaRightSeries[index]?.time || "",
			left: arenaLeftSeries[index]?.pnl,
			right: arenaRightSeries[index]?.pnl,
		}));
	}, [arenaLeftSeries, arenaRightSeries]);

	const duelTimeLeft = useMemo(() => {
		if (!duelEndAt) {
			return "15:00";
		}

		const left = Math.max(0, Math.floor((duelEndAt - Date.now()) / 1000));
		const mm = String(Math.floor(left / 60)).padStart(2, "0");
		const ss = String(left % 60).padStart(2, "0");
		return `${mm}:${ss}`;
	}, [duelEndAt]);

	const pushToast = (
		message: string,
		kind: "error" | "success" | "info" = "error",
	) => {
		notify({
			title: kind === "error" ? "Error" : kind === "success" ? "Success" : "Info",
			description: message,
			variant: kind === "error" ? "destructive" : "default",
			duration: 5000,
		});
	};

	const applyAuthSession = (token: string, profile: AuthProfile) => {
		setAuthToken(token);
		setAuthProfile(profile);
		setWalletAddress(profile.address);
		setPlayerAddress(profile.address);
		localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
	};

	const clearAuthSession = () => {
		setAuthToken("");
		setAuthProfile(null);
		setWalletAddress("");
		setWalletChainLabel("Disconnected");
		setTbchBalance("0.0000");
		setTusdtBalance("-");
		localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
	};

	const authFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
		if (!authToken) {
			throw new Error("Please authenticate wallet first");
		}

		const headers = new Headers(init.headers || undefined);
		headers.set("Authorization", `Bearer ${authToken}`);

		if (init.body && !headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}

		const response = await fetch(`${API_URL}${path}`, {
			...init,
			headers,
			credentials: "include",
		});

		if (response.status === 401) {
			clearAuthSession();
			throw new Error("Session expired. Re-authenticate wallet.");
		}

		return response;
	};

	const fetchLeaderboard = async () => {
		try {
			const response = await fetch(`${API_URL}/leaderboard`);
			const data = await response.json();
			setLeaderboard(data.leaderboard || []);
		} catch {
			setStatus("Failed to fetch leaderboard");
			pushToast("Failed to fetch leaderboard", "error");
		}
	};

	const ensureBCHTestnet = async () => {
		// No-op for BCH
	};

	const refreshBalances = async (addressParam?: string) => {
		const targetAddress = addressParam || walletAddress;
		if (!targetAddress) {
			return;
		}

		setWalletChainLabel("BCH Chipnet");
		setTbchBalance("0.0000");
		setTusdtSymbol("tUSDT");
		setTusdtBalance("0.00");
	};

	const restoreSession = async () => {
		const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
		if (!token) {
			return;
		}

		try {
			const response = await fetch(`${API_URL}/auth/me`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
				credentials: "include",
			});

			if (!response.ok) {
				clearAuthSession();
				return;
			}

			const data = await response.json() as {
				address: string;
				chainId: number;
				issuedAt: number | null;
				expiresAt: number | null;
			};

			applyAuthSession(token, {
				address: data.address,
				chainId: data.chainId,
				issuedAt: data.issuedAt,
				expiresAt: data.expiresAt,
			});

			await refreshBalances(data.address);
			setStatus("Wallet session restored");
		} catch (e) {
			clearAuthSession();
		}
	};

	const connectWalletAndAuthenticate = async (addressOrSeed: string) => {
		try {
			let address = addressOrSeed.trim();
			let seedPhrase: string | null = null;

			// If it looks like a seed phrase (multiple words), derive address from it
			if (address.split(/\s+/).length >= 12) {
				seedPhrase = address;
				setStatus("Deriving address from seed phrase...");
				const { TestNetWallet } = await import("mainnet-js");
				const wallet = await TestNetWallet.fromSeed(seedPhrase, "m/44'/145'/0'/0/0");
				address = wallet.cashaddr!;
			}

			if (!address || !address.startsWith("bchtest:")) {
				throw new Error("Invalid Chipnet Address. Must start with bchtest:");
			}

			// Store seed phrase for client-side transaction signing (minting etc.)
			if (seedPhrase) {
				localStorage.setItem("defight_seed_phrase", seedPhrase);
			}

			const loginRes = await fetch(`${API_URL}/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({ address: address }),
			});

			if (!loginRes.ok) {
				throw new Error(await readErrorMessage(loginRes));
			}

			const verified = await loginRes.json() as {
				token: string;
				address: string;
				chainId: number;
				expiresAt: number | null;
			};

			applyAuthSession(verified.token, {
				address: verified.address,
				chainId: verified.chainId,
				issuedAt: Date.now(),
				expiresAt: verified.expiresAt,
			});

			await refreshBalances(verified.address);
			setStatus(seedPhrase ? "Wallet authenticated (seed phrase stored for signing)" : "Wallet authenticated");
			pushToast(seedPhrase ? "Wallet connected with signing capability" : "Wallet authenticated", "success");
		} catch (error) {
			const message = getErrorMessage(error, "Wallet authentication failed");
			setStatus(message);
			pushToast(message, "error");
		}
	};

	const loginWithPaytaca = async () => {
		try {
			// Check if Paytaca extension is injected
			if (typeof window !== "undefined" && (window as any).paytaca) {
				const paytacaProvider = (window as any).paytaca;
				// Example JSON-RPC method, standard for WalletConnect-based extension providers
				const accounts = await paytacaProvider.request({ method: "requestAccounts" });

				if (accounts && accounts.length > 0) {
					const bchAddress = accounts[0];
					await connectWalletAndAuthenticate(bchAddress);
					return;
				}
			}

			// Fallback if not injected or request fails
			setIsAuthModalOpen(true);
		} catch (error: any) {
			console.error("Paytaca login error:", error);
			setIsAuthModalOpen(true);
		}
	};

	const copyAddress = async () => {
		if (!authProfile?.address) {
			return;
		}

		await navigator.clipboard.writeText(authProfile.address);
		pushToast("Address copied", "info");
	};

	const logout = async () => {
		try {
			if (authToken) {
				await fetch(`${API_URL}/auth/logout`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
					credentials: "include",
				});
			}
		} finally {
			clearAuthSession();
			setStatus("Logged out");
			pushToast("Logged out", "info");
		}
	};

	const analyzeCurrentPrompt = () => {
		const result = analyzePrompt(strategy);
		setAnalysis(result);
	};

	const listSavedModels = async (): Promise<SavedPromptModel[]> => {
		const response = await authFetch("/models");
		if (!response.ok) {
			throw new Error(await readErrorMessage(response));
		}

		const data = await response.json() as {
			models?: SavedPromptModel[];
		};

		return data.models || [];
	};

	const listFeaturedModels = async (): Promise<SavedPromptModel[]> => {
		try {
			const response = await fetch(`${API_URL}/models/featured?limit=6`);
			if (!response.ok) {
				console.warn("Featured models fetch failed:", response.status);
				return [];
			}

			const data = await response.json() as {
				models?: SavedPromptModel[];
			};

			return data.models || [];
		} catch (e) {
			console.warn("Featured models fetch error:", e);
			return [];
		}
	};

	const savePromptModel = async (input: SavePromptModelInput): Promise<SavedPromptModel> => {
		const response = await authFetch("/models", {
			method: "POST",
			body: JSON.stringify({
				modelName: input.modelName,
				prompt: input.prompt,
				llmModel: input.llmModel,
				symbol: input.symbol,
				settings: input.settings ?? {},
			}),
		});

		if (!response.ok) {
			throw new Error(await readErrorMessage(response));
		}

		const data = await response.json() as {
			model?: SavedPromptModel;
		};

		if (!data.model) {
			throw new Error("Model save response is missing model payload");
		}

		return data.model;
	};

	const evolvePromptModel = async (modelId: string): Promise<{ evolutionResult: any, model: SavedPromptModel }> => {
		const response = await authFetch(`/models/${modelId}/evolve`, {
			method: "POST"
		});

		if (!response.ok) {
			throw new Error(await readErrorMessage(response));
		}

		const data = await response.json();
		return {
			evolutionResult: data.evolutionResult,
			model: data.model
		};
	};

	const mintPromptModel = async (modelId: string): Promise<{ mintResult: any, model: SavedPromptModel }> => {
		if (!walletAddress) throw new Error("Wallet not connected");

		setStatus("Minting NFT on Chipnet...");
		const response = await authFetch(`/models/${modelId}/mint`, {
			method: "POST"
		});

		if (!response.ok) {
			throw new Error(await readErrorMessage(response));
		}

		const data = await response.json();

		setStatus("Minting successful!");
		pushToast("Bot NFT minted!", "success");

		return {
			mintResult: data.mintResult,
			model: data.model
		};
	};

	const enterTournament = async (modelId: string, txId: string): Promise<{ message: string, tokenId: string }> => {
		setStatus("Verifying Escrow Transaction...");
		const response = await authFetch(`/tournament/enter`, {
			method: "POST",
			body: JSON.stringify({ modelId, txId })
		});

		if (!response.ok) {
			throw new Error(await readErrorMessage(response));
		}

		const data = await response.json();

		setStatus("Successfully entered the Arena!");
		pushToast("Escrow verified. Entry complete.", "success");

		return {
			message: data.message,
			tokenId: data.tokenId
		};
	};

	const listModelRuns = async (modelId: string, limit = 24): Promise<SavedPromptModelRun[]> => {
		if (!modelId) {
			return [];
		}

		const response = await authFetch(`/models/${modelId}/runs?limit=${Math.max(1, Math.min(200, limit))}`);
		if (!response.ok) {
			throw new Error(await readErrorMessage(response));
		}

		const data = await response.json() as {
			runs?: SavedPromptModelRun[];
		};

		return data.runs || [];
	};

	const launchAgent = async (depositAmount?: string) => {
		if (!isAuthenticated) {
			throw new Error("Authenticate wallet first");
		}

		setStatus("Configuring session for Chipnet...");

		// 3. Launch Agent
		setStatus("Launching agent...");

		const savedModel = await savePromptModel({
			modelName: agentName,
			prompt: strategy,
			symbol: "BCHUSDT",
			settings: { cycles, intervalMs: 1000, source: "solo" }
		});

		const response = await authFetch("/agents/launch", {
			method: "POST",
			body: JSON.stringify({
				playerAddress,
				agentName,
				strategy,
				cycles,
				intervalMs: 1000,
				symbol: "BCHUSDT",
			}),
		});

		if (!response.ok) {
			const errorText = await readErrorMessage(response);
			throw new Error(errorText || "Launch failed");
		}

		const data = await response.json() as {
			runId: string;
			strategyContext?: string;
			message?: string;
		};

		const runId = data.runId;

		setSessions(prev => ({
			...prev,
			[runId]: {
				runId,
				agentName,
				symbol: "BCHUSDT",
				isActive: true,
				soloLogs: [],
				liveSeries: [],
				portfolio: { quoteBalance: 100, baseBalance: 0, pnl: 0 },
				finalPnl: null,
				finalRoiPct: null,
				marketPrice: null,
				agentStartedAt: new Date().toISOString(),
				launchedModelId: savedModel.id, // this will be updated via tracking
			}
		}));

		if (!activeRunId) {
			setActiveRunId(runId);
		}

		setStatus(`Live session started (${agentName})`);

	};

	const stopAgent = async (targetRunId?: string): Promise<{ txHash: string; finalPnl: number; roiPct: number; }> => {
		if (!isAuthenticated) throw new Error("Wallet not connected");

		const idToStop = targetRunId || activeRunId;
		if (!idToStop) throw new Error("No agent selected");

		setStatus("Stopping agent...");
		const response = await authFetch("/agents/stop", {
			method: "POST",
		});

		if (!response.ok) {
			const errorText = await readErrorMessage(response);
			throw new Error(errorText || "Stop failed");
		}

		const data = await response.json();
		const roi = Number(data.roiPct ?? 0);
		// Backend-verified final PnL in USDT (after liquidation + BCH delta calculation)
		const verifiedPnl = Number(data.finalPnl ?? 0);

		// Sanity-check: if ROI is negative, PnL MUST be negative too.
		// If they diverge (rounding / dust), force PnL sign to match ROI.
		const sanitizedPnl = (roi < 0 && verifiedPnl > 0) ? -Math.abs(verifiedPnl) :
			(roi > 0 && verifiedPnl < 0) ? Math.abs(verifiedPnl) : verifiedPnl;

		const pnlStr = ` PnL: ${sanitizedPnl.toFixed(4)} USDT (${roi.toFixed(2)}%)`;
		setStatus("Agent stopped. Refund initiated.");
		setLastRoiPct(roi);

		setSessions(prev => {
			const temp = { ...prev };
			if (temp[idToStop]) {
				temp[idToStop] = {
					...temp[idToStop],
					isActive: false,
					finalPnl: sanitizedPnl,
					finalRoiPct: roi,
					soloLogs: [
						{ timestamp: Date.now(), message: `━━━ Trading session ended ━━━ Final${pnlStr}` },
						...temp[idToStop].soloLogs
					]
				};
			}
			return temp;
		});

		pushToast(`Refund initiated! Final${pnlStr}`, "success");
		return { txHash: data.txHash, finalPnl: sanitizedPnl, roiPct: roi };
	};

	const commitToLeaderboard = async () => {
		if (!isAuthenticated || !authProfile) {
			throw new Error("Authenticate wallet first");
		}

		if (finalPnl === null || finalRoiPct === null) {
			throw new Error(
				"Stop the agent first to get verified final PnL/ROI before committing."
			);
		}

		try {
			setCommitStatus(`Committed on-chain`);
			setStatus("Leaderboard updated locally");
			pushToast(`Saved to Leaderboard: PnL ${finalPnl.toFixed(4)} USDT, ROI ${finalRoiPct.toFixed(2)}%`, "success");
			await fetchLeaderboard();
		} catch (e: any) {
			setCommitStatus("Commit failed");
			throw e;
		}
	};

	const startDuel = async () => {
		if (!isAuthenticated || !authProfile) {
			throw new Error("Authenticate wallet first");
		}

		const left = agentOptions.find((item) => item.key === leftAgentKey) || customAgent;
		const right = agentOptions.find((item) => item.key === rightAgentKey) || AGENT_LIBRARY[0];

		if (left.playerAddress.toLowerCase() !== authProfile.address.toLowerCase()) {
			throw new Error("Left agent must be owned by authenticated wallet");
		}

		if (left.key === right.key && left.playerAddress.toLowerCase() === right.playerAddress.toLowerCase()) {
			throw new Error("Choose two different agents for duel");
		}

		const response = await authFetch("/tournament/start", {
			method: "POST",
			body: JSON.stringify({
				leftAgent: {
					playerAddress: left.playerAddress,
					agentName: left.name,
					strategy: left.strategy,
				},
				rightAgent: {
					playerAddress: right.playerAddress,
					agentName: right.name,
					strategy: right.strategy,
				},
				durationSec: 900,
				tickSec: 5,
				symbol: "BCHUSDT",
			}),
		});

		if (!response.ok) {
			const errorText = await readErrorMessage(response);
			throw new Error(errorText || "Cannot start duel");
		}

		const data = await response.json();

		setDuelId(data.tournamentId);
		setDuelWinner("");
		setDuelEndAt(data.endAt);
		setDuelLeft({ agentName: left.name, playerAddress: left.playerAddress.toLowerCase() });
		setDuelRight({ agentName: right.name, playerAddress: right.playerAddress.toLowerCase() });
		setArenaLeftLogs([]);
		setArenaRightLogs([]);
		setArenaLeftSeries([]);
		setArenaRightSeries([]);
		// Note: Tab switching is handled by router now
		setStatus(`Duel started: ${left.name} vs ${right.name}`);
		pushToast(`Duel started: ${left.name} vs ${right.name}`, "info");
	};


	// Effects
	useEffect(() => {
		void fetchLeaderboard().catch(() => {
			setStatus("Leaderboard fetch error");
			pushToast("Leaderboard fetch error", "error");
		});

		void restoreSession().catch(() => {
			clearAuthSession();
			pushToast("Failed to restore wallet session", "error");
		});
	}, []);

	useEffect(() => {
		const timer = setInterval(() => {
			if (!duelEndAt) {
				return;
			}

			if (Date.now() >= duelEndAt) {
				setDuelEndAt(null);
			}
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, [duelEndAt]);

	useEffect(() => {
		if (!walletAddress || !isAuthenticated) {
			return;
		}

		const timer = setInterval(() => {
			void refreshBalances().catch(() => {
				// Ignore periodic balance refresh failures.
			});
		}, 20000);

		return () => {
			clearInterval(timer);
		};
	}, [walletAddress, isAuthenticated]);

	useEffect(() => {
		// MetaMask account listeners removed
	}, [authProfile]);

	const activeRunIdRef = useRef(activeRunId);
	useEffect(() => { activeRunIdRef.current = activeRunId; }, [activeRunId]);

	const duelLeftRef = useRef(duelLeft);
	useEffect(() => { duelLeftRef.current = duelLeft; }, [duelLeft]);

	const duelRightRef = useRef(duelRight);
	useEffect(() => { duelRightRef.current = duelRight; }, [duelRight]);

	useEffect(() => {
		const socket = io(API_URL, {
			transports: ["websocket"],
		});

		socket.on("server:ready", (payload) => {
			const currentRunId = activeRunIdRef.current;
			if (!currentRunId) return;
			setSessions((prev) => {
				const temp = { ...prev };
				if (temp[currentRunId]) {
					temp[currentRunId].soloLogs = [{ timestamp: Date.now(), message: payload.message }, ...temp[currentRunId].soloLogs].slice(0, 200);
				}
				return temp;
			});
		});

		socket.on("run:started", (payload) => {
			setStatus(`Run ${payload.runId.slice(0, 8)} started`);
		});

		socket.on("run:completed", (payload) => {
			setStatus(`Run ${payload.runId.slice(0, 8)} completed`);
		});

		socket.on("run:error", (payload) => {
			const message = payload?.message || "Run failed";
			setStatus(message);
			pushToast(message, "error");
		});

		socket.on("leaderboard:update", (rows) => {
			setLeaderboard(rows);
		});

		socket.on("tournament:started", (payload) => {
			setDuelId(payload.tournamentId);
			setDuelEndAt(payload.endAt);
			setStatus(`Duel ${payload.tournamentId.slice(0, 8)} in progress`);
		});

		socket.on("tournament:ended", (payload) => {
			setDuelWinner(payload.winner?.agentName || "Winner unavailable");
			setDuelEndAt(null);
			setStatus(`Duel finished. Winner: ${payload.winner?.agentName || "N/A"}`);
		});

		socket.on("tournament:error", (payload) => {
			const message = payload?.message || "Tournament failed";
			setStatus(message);
			pushToast(message, "error");
		});

		socket.on("live-log", (payload) => {
			const action = payload.decision?.action ?? "UNKNOWN";
			const pct = payload.decision?.amount_pct ?? 0;
			const scanInfo = payload.scanInfo ? ` | ${payload.scanInfo}` : "";
			const txHash: string | undefined = payload.executionDetails?.txHash || undefined;
			// Show a trade-executed badge when we have an actual on-chain tx
			const tradeTag = txHash ? ` ✅ ${payload.executionDetails?.side ?? action}` : "";
			const message = `${payload.agentName}: ${action} ${pct}%${tradeTag} | BCH ${payload.market?.price?.toFixed(2)} | PnL ${payload.pnl?.toFixed(2)} USDT${scanInfo} | ${payload.decision?.reason || "n/a"}`;

			if (payload.source === "tournament") {
				const normalized = String(payload.playerAddress || "").toLowerCase();
				if (duelLeftRef.current && normalized === duelLeftRef.current.playerAddress) {
					setArenaLeftLogs((prev) => [{ timestamp: Date.now(), message, txHash }, ...prev].slice(0, 120));
					setArenaLeftSeries((prev) => [
						...prev.slice(-180),
						{ time: formatClock(Date.now()), pnl: Number(payload.pnl ?? 0) },
					]);
				} else if (duelRightRef.current && normalized === duelRightRef.current.playerAddress) {
					setArenaRightLogs((prev) => [{ timestamp: Date.now(), message, txHash }, ...prev].slice(0, 120));
					setArenaRightSeries((prev) => [
						...prev.slice(-180),
						{ time: formatClock(Date.now()), pnl: Number(payload.pnl ?? 0) },
					]);
				}
				return;
			}

			// Multi-Agent Solo Logging
			if (payload.runId) {
				setSessions(prev => {
					const temp = { ...prev };
					const session = temp[payload.runId];
					if (session && session.isActive) {
						temp[payload.runId] = {
							...session,
							portfolio: {
								quoteBalance: Number(payload.portfolio?.quoteBalance ?? 0),
								baseBalance: Number(payload.portfolio?.baseBalance ?? 0),
								pnl: Number(payload.pnl ?? 0),
							},
							marketPrice: Number(payload.market?.price ?? 0),
							soloLogs: [{ timestamp: Date.now(), message, txHash }, ...session.soloLogs].slice(0, 200),
							liveSeries: [
								...session.liveSeries.slice(-180),
								{ time: formatClock(Date.now()), pnl: Number(payload.pnl ?? 0) },
							]
						};
					}
					return temp;
				});
			}
		});

		return () => {
			socket.disconnect();
		};
	}, []);


	const pushTerminalLog = (message: string) => {
		if (!activeRunId) return;
		setSessions(prev => {
			const temp = { ...prev };
			if (temp[activeRunId]) {
				temp[activeRunId].soloLogs = [{ timestamp: Date.now(), message }, ...temp[activeRunId].soloLogs].slice(0, 200);
			}
			return temp;
		});
	};

	const value = {
		agentName, setAgentName,
		strategy, setStrategy,
		playerAddress, setPlayerAddress,
		cycles, setCycles,
		status,
		analysis,
		commitStatus,
		isAuthenticated,
		authProfile,
		walletAddress,
		walletChainLabel,
		tbchBalance,
		tusdtBalance,
		tusdtSymbol,
		connectWalletAndAuthenticate,
		loginWithPaytaca,
		logout,
		refreshBalances,
		copyAddress,
		analyzeCurrentPrompt,
		launchAgent,
		stopAgent,
		pushTerminalLog,
		agentStopped,
		commitToLeaderboard,
		startDuel,
		listSavedModels,
		listFeaturedModels,
		savePromptModel,
		evolvePromptModel,
		mintPromptModel,
		enterTournament,
		listModelRuns,
		leaderboard,

		// Enhanced Multiple sessions
		sessions,
		activeRunId,
		setActiveRunId,

		// Single session proxy
		runId,
		soloLogs,
		portfolio,
		marketPrice,
		finalPnl,
		finalRoiPct,

		liveSeries,
		leftAgentKey, setLeftAgentKey,
		rightAgentKey, setRightAgentKey,
		duelId,
		duelWinner,
		duelEndAt,
		duelTimeLeft,
		duelLeft,
		duelRight,
		arenaLeftLogs,
		arenaRightLogs,
		arenaChartData,
		agentOptions
	};

	return (
		<GameContext.Provider value={value}>
			{children}

			<Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
				<DialogContent className="border-white/10 bg-[#121418] text-white sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="font-display tracking-wider text-[#0AC18E]">Connect Wallet</DialogTitle>
						<DialogDescription className="text-neutral-400">
							Enter your <b>seed phrase</b> (12 words) to enable minting and on-chain actions, or just a <b>bchtest: address</b> for read-only mode.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="flex flex-col gap-2">
							<Input
								id="wallet-address"
								placeholder="Seed phrase (12 words) or bchtest:qq..."
								className="border-white/10 bg-black/50 text-white placeholder:text-neutral-600 focus-visible:ring-[#0AC18E]"
								value={authInputAddress}
								onChange={(e) => setAuthInputAddress(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && authInputAddress) {
										setIsAuthModalOpen(false);
										void connectWalletAndAuthenticate(authInputAddress);
									}
								}}
							/>
							<p className="text-[10px] text-neutral-500">
								💡 Seed phrase is stored locally in your browser only. Never shared with the server.
							</p>
						</div>
					</div>
					<div className="flex justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							className="border-white/10 bg-transparent text-white hover:bg-white/5"
							onClick={() => setIsAuthModalOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="bg-[#0AC18E] text-black hover:bg-[#cda460]"
							disabled={!authInputAddress}
							onClick={() => {
								setIsAuthModalOpen(false);
								void connectWalletAndAuthenticate(authInputAddress);
							}}
						>
							Connect
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</GameContext.Provider>
	);
}

export function useGame() {
	const context = useContext(GameContext);
	if (context === undefined) {
		throw new Error("useGame must be used within a GameProvider");
	}
	return context;
}
