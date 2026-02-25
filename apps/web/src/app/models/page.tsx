"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast as notify } from "@/hooks/use-toast";
import {
	SavedPromptModel,
	SavedPromptModelRun,
	shortAddress,
	useGame,
} from "@/context/GameContext";
import { getErrorMessage, runSafeAction } from "@/lib/safe-action";
import { PremiumCard } from "@/components/home/hero/PremiumCard";
import { AgentPromptCardEntity } from "@/components/home/hero/types";
import {
	Sparkles,
	Plus,
	Search,
	LayoutGrid,
	Database,
	Wallet,
	RefreshCw,
	BrainCircuit,
	Coins,
	Tags
} from "lucide-react";

function parseTokensInput(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim().toUpperCase())
		.filter(Boolean);
}

function upsertModels(current: SavedPromptModel[], next: SavedPromptModel): SavedPromptModel[] {
	const withoutCurrent = current.filter((item) => item.id !== next.id);
	return [next, ...withoutCurrent].sort((a, b) => {
		const aTs = Date.parse(a.updatedAt || a.createdAt || "");
		const bTs = Date.parse(b.updatedAt || b.createdAt || "");
		return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
	});
}

export default function ModelsPage() {
	const {
		isAuthenticated,
		authProfile,
		walletAddress,
		agentName,
		strategy,
		connectWalletAndAuthenticate,
		listSavedModels,
		savePromptModel,
		listModelRuns,
	} = useGame();

	const [modelName, setModelName] = useState(agentName || "Market Maverick");
	const [prompt, setPrompt] = useState(strategy);
	const [symbol, setSymbol] = useState("BNBUSDT");
	const [llmModel, setLlmModel] = useState("gpt-4.1-mini");
	const [tokensInput, setTokensInput] = useState("BNB,USDT");
	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [models, setModels] = useState<SavedPromptModel[]>([]);
	const [runsByModel, setRunsByModel] = useState<Record<string, SavedPromptModelRun[]>>({});

	const ownerAddress = authProfile?.address || walletAddress;
	const totalModels = models.length;
	const totalRuns = useMemo(
		() => models.reduce((acc, model) => acc + (model.totalRuns ?? 0), 0),
		[models],
	);

	useEffect(() => {
		if (!isAuthenticated) {
			setModels([]);
			setRunsByModel({});
			return;
		}

		let cancelled = false;
		const load = async () => {
			setIsLoading(true);
			try {
				const fetched = await listSavedModels();
				if (cancelled) {
					return;
				}

				setModels(fetched);
				const runsEntries = await Promise.all(
					fetched.map(async (model) => {
						const runs = await listModelRuns(model.id, 30);
						return [model.id, runs] as const;
					}),
				);

				if (cancelled) {
					return;
				}

				setRunsByModel(Object.fromEntries(runsEntries));
			} catch (error) {
				notify({
					title: "Error",
					description: getErrorMessage(error, "Failed to load models"),
					variant: "destructive",
					duration: 5000,
				});
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [isAuthenticated]);

	const handleSaveModel = async () => {
		if (!isAuthenticated) {
			throw new Error("Authenticate wallet first");
		}

		const cleanName = modelName.trim();
		const cleanPrompt = prompt.trim();
		const cleanSymbol = symbol.trim().toUpperCase();
		const assets = parseTokensInput(tokensInput);

		if (cleanName.length < 2) {
			throw new Error("Model name must contain at least 2 characters");
		}
		if (cleanPrompt.length < 10) {
			throw new Error("Prompt must contain at least 10 characters");
		}
		if (cleanSymbol.length < 4) {
			throw new Error("Token pair is required");
		}

		setIsSaving(true);
		try {
			const saved = await savePromptModel({
				modelName: cleanName,
				prompt: cleanPrompt,
				llmModel: llmModel.trim() || "gpt-4.1-mini",
				symbol: cleanSymbol,
				settings: {
					assets,
					source: "model-studio",
				},
			});

			setModels((current) => upsertModels(current, saved));

			const runs = await listModelRuns(saved.id, 30);
			setRunsByModel((current) => ({
				...current,
				[saved.id]: runs,
			}));

			notify({
				title: "Success",
				description: `Model "${saved.modelName}" saved`,
				variant: "default",
				duration: 4000,
			});
		} finally {
			setIsSaving(false);
		}
	};

	const refreshModels = async () => {
		if (!isAuthenticated) {
			return;
		}

		setIsLoading(true);
		try {
			const fetched = await listSavedModels();
			setModels(fetched);

			const runsEntries = await Promise.all(
				fetched.map(async (model) => {
					const runs = await listModelRuns(model.id, 30);
					return [model.id, runs] as const;
				}),
			);
			setRunsByModel(Object.fromEntries(runsEntries));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="relative min-h-screen w-full overflow-hidden pt-24 pb-20">
			{/* Ambient Background Effects */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-neutral-950 to-neutral-950" />
			<div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[#e4bf80]/20 to-transparent" />

			<div className="mx-auto max-w-7xl px-6 lg:px-8">

				{/* Header */}
				<div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="font-display text-4xl font-bold uppercase tracking-wide text-white">
							Model <span className="text-[#e4bf80]">Studio</span>
						</h1>
						<p className="mt-2 max-w-xl text-neutral-400">
							Create, manage, and backtest your agent strategies.
							Deploy your best models to the arena.
						</p>
					</div>

					{isAuthenticated && (
						<div className="flex items-center gap-4">
							<div className="hidden md:flex flex-col items-end">
								<span className="text-xs uppercase tracking-wider text-neutral-500">Total Models</span>
								<span className="font-display text-xl text-white">{totalModels}</span>
							</div>
							<div className="h-8 w-px bg-white/10 hidden md:block"></div>
							<div className="hidden md:flex flex-col items-end">
								<span className="text-xs uppercase tracking-wider text-neutral-500">Total Runs</span>
								<span className="font-display text-xl text-[#e4bf80]">{totalRuns}</span>
							</div>
						</div>
					)}
				</div>

				{!isAuthenticated ? (
					<div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-[#121418] p-12 text-center shadow-2xl">
						<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e4bf80]/10 text-[#e4bf80]">
							<Wallet className="h-8 w-8" />
						</div>
						<h2 className="font-display text-2xl text-white">Connect Wallet to Access Studio</h2>
						<p className="mt-2 max-w-md text-sm text-neutral-400">
							You need to be authenticated to save models and track performance history.
						</p>
						<Button
							type="button"
							className="mt-8 bg-[#e4bf80] text-black hover:bg-[#cda460] px-8"
							onClick={() => {
								void runSafeAction(connectWalletAndAuthenticate);
							}}
						>
							Connect Wallet
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

						{/* Left Column: Creator Form */}
						<div className="lg:col-span-5 space-y-6">
							<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#121418] p-1">
								<div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

								<div className="relative rounded-xl bg-neutral-900/50 p-6 backdrop-blur-md">
									<div className="mb-6 flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e4bf80]/10 text-[#e4bf80]">
												<Plus className="h-4 w-4" />
											</div>
											<h3 className="font-display text-lg font-medium text-white uppercase tracking-wide">New Model</h3>
										</div>
									</div>

									<form
										onSubmit={(event) => {
											event.preventDefault();
											void runSafeAction(
												handleSaveModel,
												{ fallbackMessage: "Cannot save model" },
											);
										}}
										className="space-y-5"
									>
										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<LayoutGrid className="h-3 w-3" /> Model Name
											</label>
											<Input
												className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#e4bf80]/50 h-10"
												value={modelName}
												onChange={(event) => setModelName(event.target.value)}
												placeholder="e.g. Market Maverick"
											/>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-2">
												<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
													<Coins className="h-3 w-3" /> Pair
												</label>
												<Input
													className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#e4bf80]/50 h-10 uppercase font-mono text-xs"
													value={symbol}
													onChange={(event) => setSymbol(event.target.value)}
													placeholder="BNBUSDT"
												/>
											</div>
											<div className="space-y-2">
												<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
													<BrainCircuit className="h-3 w-3" /> LLM
												</label>
												<Input
													className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#e4bf80]/50 h-10 text-xs"
													value={llmModel}
													onChange={(event) => setLlmModel(event.target.value)}
													placeholder="gpt-4.1-mini"
												/>
											</div>
										</div>

										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Tags className="h-3 w-3" /> Assets Included
											</label>
											<Input
												className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#e4bf80]/50 h-10 uppercase font-mono text-xs"
												value={tokensInput}
												onChange={(event) => setTokensInput(event.target.value)}
												placeholder="BNB, USDT"
											/>
										</div>

										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Database className="h-3 w-3" /> Strategy Prompt
											</label>
											<Textarea
												className="min-h-[200px] resize-none border-white/10 bg-black/20 p-3 text-sm leading-relaxed text-neutral-200 placeholder:text-neutral-700 focus:border-[#e4bf80]/50 font-mono"
												value={prompt}
												onChange={(event) => setPrompt(event.target.value)}
											/>
										</div>

										<div className="pt-2 flex gap-3">
											<Button
												type="submit"
												disabled={isSaving}
												className="flex-1 bg-[#e4bf80] text-black hover:bg-[#cda460]"
											>
												{isSaving ? "Saving..." : "Save Model"}
											</Button>
											<Button
												type="button"
												variant="secondary"
												disabled={isLoading}
												onClick={() => {
													void runSafeAction(refreshModels, { fallbackMessage: "Cannot refresh model cards" });
												}}
												className="border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300"
											>
												<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
											</Button>
										</div>
									</form>
								</div>
							</div>
						</div>

						{/* Right Column: Model Cards */}
						<div className="lg:col-span-7">
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-display text-lg text-white">Your Models</h2>
								<div className="text-xs text-neutral-500 font-mono">
									{models.length} stored
								</div>
							</div>

							{models.length === 0 && !isLoading ? (
								<div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
									<Search className="mb-4 h-10 w-10 text-neutral-600" />
									<h3 className="text-lg font-medium text-neutral-300">No Models Found</h3>
									<p className="mt-2 text-sm text-neutral-500">
										Create a strategy on the left panel to build your portfolio.
									</p>
								</div>
							) : (
								<div className="flex flex-wrap gap-6 justify-center lg:justify-start">
									{models.map((model) => {
										// Map SavedPromptModel to AgentPromptCardEntity for PremiumCard
										const cardEntity: AgentPromptCardEntity = {
											id: model.id,
											agentName: model.modelName,
											prompt: model.prompt,
											walletAddress: ownerAddress,
											pnl: model.lastPnl || 0,
											roiPct: model.lastRoiPct || 0,
											trades: model.totalTrades || 0,
											winRatePct: 50 + (model.lastRoiPct || 0), // heuristics for demo
											updatedAtLabel: model.updatedAt ? new Date(model.updatedAt).toLocaleDateString() : "New",
											sourceLabel: model.symbol,
											status: "READY"
										};

										return (
											<PremiumCard
												key={model.id}
												card={cardEntity}
												onActivate={() => {
													// Example action: map to edit or just notify
													notify({
														title: "Model Selected",
														description: `Loaded ${model.modelName} into active memory.`,
													});
												}}
											/>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
