"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { runSafeAction } from "@/lib/safe-action";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sparkles,
	Play,
	ChevronDown,
	Activity,
	Cpu,
	Shield,
	Zap,
	BarChart3,
	Terminal,
	Wallet,
	Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const TRADING_PAIRS = [
	{ symbol: "BCHUSDT", name: "BCH / USDT" },
	{ symbol: "BTCUSDT", name: "BTC / USDT" },
	{ symbol: "ETHUSDT", name: "ETH / USDT" },
	{ symbol: "SOLUSDT", name: "SOL / USDT" },
	// Reverse Pairs
	{ symbol: "USDTBCH", name: "USDT / BCH" },
	{ symbol: "USDTBTC", name: "USDT / BTC" },
	{ symbol: "USDTETH", name: "USDT / ETH" },
	{ symbol: "USDTSOL", name: "USDT / SOL" },
];

export default function ForgePage() {
	const {
		agentName,
		setAgentName,
		playerAddress,
		setPlayerAddress,
		strategy,
		setStrategy,
		cycles,
		setCycles,
		analyzeCurrentPrompt,
		launchAgent,
		analysis,
	} = useGame();

	const router = useRouter();
	const [selectedPair, setSelectedPair] = useState(TRADING_PAIRS[0]);
	const [price, setPrice] = useState<number | null>(null);
	const [loadingPrice, setLoadingPrice] = useState(false);
	const [depositAmount, setDepositAmount] = useState("0.01");

	// Persist strategies per pair
	const [strategies, setStrategies] = useState<Record<string, string>>({});

	const handlePairChange = (newPair: typeof TRADING_PAIRS[0]) => {
		// Save current strategy for the old pair
		setStrategies((prev) => ({
			...prev,
			[selectedPair.symbol]: strategy,
		}));

		const savedStrategy = strategies[newPair.symbol];

		// If a strategy exists for the new pair, load it.
		// Otherwise, keep the current strategy (copy over behavior).
		if (savedStrategy !== undefined) {
			setStrategy(savedStrategy);
		}

		setSelectedPair(newPair);
	};

	useEffect(() => {
		let interval: NodeJS.Timeout;

		const fetchPrice = async () => {
			try {
				const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/market/price/${selectedPair.symbol}`);
				if (response.ok) {
					const data = await response.json();
					setPrice(data.price);
				}
			} catch (error) {
				console.error("Failed to fetch price:", error);
			} finally {
				setLoadingPrice(false);
			}
		};

		setLoadingPrice(true);
		fetchPrice();
		interval = setInterval(fetchPrice, 10000);

		return () => clearInterval(interval);
	}, [selectedPair]);

	const handleLaunch = async () => {
		await launchAgent(depositAmount);
		router.push("/live");
	};

	return (
		<main className="relative min-h-screen w-full overflow-hidden pt-24 pb-20">
			{/* Ambient Background Effects */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-neutral-950 to-neutral-950" />
			<div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[#e4bf80]/20 to-transparent" />

			<div className="mx-auto max-w-7xl px-6 lg:px-8">

				{/* Header Section */}
				<div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="font-display text-4xl font-bold uppercase tracking-wide text-white">
							Agent <span className="text-[#e4bf80]">Forge</span>
						</h1>
						<p className="mt-2 max-w-xl text-neutral-400">
							Architect your autonomous trading strategy using natural language.
							Define parameters, risk controls, and execution logic.
						</p>
					</div>
					<div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
						<div className="flex items-center gap-2">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
							</span>
							<span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">System Online</span>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

					{/* Left Column: Configuration */}
					<div className="lg:col-span-8 flex flex-col gap-6">

						{/* Market Data Panel */}
						<div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#121418] p-1 transition-all">
							<div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

							<div className="relative rounded-xl bg-neutral-900/50 p-5 backdrop-blur-md">
								<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

									<div className="flex items-center gap-6">
										{/* Pair Selector */}
										<div className="space-y-1.5">
											<label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mr-2">Target Pair</label>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="outline"
														className="w-[160px] justify-between border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-[#e4bf80] transition-colors"
													>
														<span className="font-mono">{selectedPair.name}</span>
														<ChevronDown className="h-3 w-3 opacity-50" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent className="border-neutral-800 bg-[#1a1d21] text-neutral-200">
													{TRADING_PAIRS.map((pair) => (
														<DropdownMenuItem
															key={pair.symbol}
															className="font-mono cursor-pointer hover:bg-white/5 hover:text-[#e4bf80] focus:bg-white/5 focus:text-[#e4bf80]"
															onClick={() => handlePairChange(pair)}
														>
															{pair.name}
														</DropdownMenuItem>
													))}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>

										<div className="h-10 w-px bg-white/5 hidden sm:block"></div>

										{/* Price Display */}
										<div className="space-y-1.5">
											<label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Mark Price</label>
											<div className="flex items-baseline gap-2">
												<span className="font-mono text-2xl font-bold tracking-tight text-white">
													{price ? `$${price.toFixed(2)}` : "---.--"}
												</span>
												{loadingPrice && (
													<Activity className="h-3 w-3 animate-pulse text-[#e4bf80]" />
												)}
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2 text-xs text-neutral-500">
										<Zap className="h-3 w-3" />
										<span>Real-time Binance Feed</span>
									</div>
								</div>
							</div>
						</div>

						{/* Strategy Editor Panel */}
						<div className="relative rounded-2xl border border-white/5 bg-[#121418] p-1 shadow-2xl">
							<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

							<div className="relative rounded-xl bg-neutral-900/50 p-6 backdrop-blur-sm">
								<div className="mb-6 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e4bf80]/10 text-[#e4bf80]">
											<Cpu className="h-4 w-4" />
										</div>
										<h3 className="font-display text-lg font-medium text-white uppercase tracking-wide">Agent Configuration</h3>
									</div>
									<div className="flex items-center gap-2 text-xs text-neutral-500">
										<div className="h-1.5 w-1.5 rounded-full bg-[#e4bf80]"></div>
										Draft Mode
									</div>
								</div>

								<div className="space-y-6">
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Shield className="h-3 w-3" /> Agent Designation
											</label>
											<Input
												className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#e4bf80]/50 focus:ring-[#e4bf80]/20 h-11"
												placeholder="e.g. TrendMaster Alpha"
												value={agentName}
												onChange={(e) => setAgentName(e.target.value)}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Wallet className="h-3 w-3" /> Controller Address
											</label>
											<Input
												className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#e4bf80]/50 focus:ring-[#e4bf80]/20 font-mono text-xs h-11"
												placeholder="0x..."
												value={playerAddress}
												onChange={(e) => setPlayerAddress(e.target.value)}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Terminal className="h-3 w-3" /> Strategy Directive
											</label>
											<span className="text-[10px] text-neutral-600 uppercase tracking-wider">Natural Language Processing Active</span>
										</div>
										<div className="relative">
											<Textarea
												className="min-h-[320px] resize-none border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-neutral-200 placeholder:text-neutral-700 focus:border-[#e4bf80]/50 focus:ring-[#e4bf80]/20 font-mono"
												placeholder="Describe your strategy here. For example: 'Monitor RSI(14) on 15m timeframe. If RSI < 30 and price is above 200 EMA, enter LONG. Take profit at 1.5% and stop loss at 0.5%...'"
												value={strategy}
												onChange={(e) => setStrategy(e.target.value)}
											/>
											<div className="absolute bottom-4 right-4 text-[10px] text-neutral-600 font-mono bg-black/40 px-2 py-1 rounded">
												{strategy.length} chars
											</div>
										</div>
									</div>

									<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 items-end">
										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Clock className="h-3 w-3" /> Execution Cycles
											</label>
											<div className="relative">
												<Input
													className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#e4bf80]/50 focus:ring-[#e4bf80]/20 h-11 pr-16"
													type="number"
													min={10}
													max={1800}
													value={cycles}
													onChange={(e) => setCycles(Number(e.target.value))}
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-mono">
													SECONDS
												</span>
											</div>
										</div>

										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Wallet className="h-3 w-3" /> Deposit (BCH)
											</label>
											<div className="relative">
												<Input
													className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#e4bf80]/50 focus:ring-[#e4bf80]/20 h-11 pr-8 "
													type="number"
													step="0.001"
													min={0.001}
													max={10}
													value={depositAmount}
													onChange={(e) => setDepositAmount(e.target.value)}
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-mono">
													BCH
												</span>
											</div>
										</div>

										<div className="flex gap-3 col-span-1 md:col-span-2 lg:col-span-2 justify-end">
											<Button
												type="button"
												variant="secondary"
												onClick={analyzeCurrentPrompt}
												className="border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white h-11 uppercase tracking-wider text-xs font-bold px-6"
											>
												<Sparkles className="mr-2 h-3.5 w-3.5" />
												Analyze
											</Button>
											<Button
												type="button"
												className="bg-[#e4bf80] text-black hover:bg-[#cda460] h-11 uppercase tracking-wider text-xs font-bold px-8 shadow-[0_0_20px_rgba(228,191,128,0.2)] hover:shadow-[0_0_30px_rgba(228,191,128,0.4)] transition-all"
												onClick={() => {
													void runSafeAction(handleLaunch);
												}}
											>
												<Play className="mr-2 h-3.5 w-3.5" />
												Deploy Agent
											</Button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Right Column: Analysis */}
					<div className="lg:col-span-4 space-y-6">

						{/* Analysis Score Card */}
						<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#121418] p-1">
							<div className="relative rounded-xl bg-neutral-900/50 p-6 backdrop-blur-md h-full min-h-[400px]">
								<div className="flex items-center gap-3 mb-8">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
										<BarChart3 className="h-4 w-4" />
									</div>
									<h3 className="font-display text-lg font-medium text-white uppercase tracking-wide">Analysis Report</h3>
								</div>

								{!analysis ? (
									<div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4 opacity-50">
										<div className="relative">
											<div className="absolute inset-0 bg-[#e4bf80] blur-xl opacity-20 animate-pulse" />
											<Sparkles className="h-12 w-12 text-[#e4bf80] relative z-10" />
										</div>
										<p className="text-sm text-neutral-400 max-w-[200px] leading-relaxed">
											Awaiting strategy analysis. Run validation to generate report.
										</p>
									</div>
								) : (
									<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
										{/* Score Dial */}
										<div className="flex justify-center py-4">
											<div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/5 bg-black/20">
												<svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
													<circle
														cx="50"
														cy="50"
														r="46"
														fill="none"
														stroke="#e4bf80"
														strokeWidth="4"
														strokeDasharray={`${analysis.score * 2.89} 289`}
														strokeLinecap="round"
														className="transition-all duration-1000 ease-out"
													/>
												</svg>
												<div className="flex flex-col items-center">
													<span className="font-display text-4xl font-bold text-white">{analysis.score}</span>
													<span className="text-[10px] uppercase tracking-wider text-neutral-500">Score</span>
												</div>
											</div>
										</div>

										<div className="rounded-lg border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-neutral-300">
											{analysis.summary}
										</div>

										<div className="space-y-3">
											<h4 className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-2">Detailed Checks</h4>
											{analysis.checks.map((item, i) => (
												<div
													key={i}
													className={cn(
														"flex items-center gap-3 rounded-lg border p-3 transition-colors",
														item.passed
															? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
															: "border-rose-500/20 bg-rose-500/5 text-rose-200"
													)}
												>
													<div className={cn(
														"flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
														item.passed ? "bg-emerald-500/20" : "bg-rose-500/20"
													)}>
														{item.passed ? "✓" : "!"}
													</div>
													<span className="text-xs font-medium">{item.label}</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Quick Tips */}
						<div className="rounded-2xl border border-white/5 bg-[#121418] p-6">
							<h4 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-neutral-400 mb-4">
								<Sparkles className="h-3 w-3 text-[#e4bf80]" /> Pro Tips
							</h4>
							<ul className="space-y-3">
								<li className="flex gap-3 text-xs text-neutral-500 leading-relaxed">
									<span className="h-1.5 w-1.5 rounded-full bg-[#e4bf80] mt-1.5 shrink-0" />
									Include specific technical indicators (RSI, MACD, Bollinger Bands) for better precision.
								</li>
								<li className="flex gap-3 text-xs text-neutral-500 leading-relaxed">
									<span className="h-1.5 w-1.5 rounded-full bg-[#e4bf80] mt-1.5 shrink-0" />
									Explicitly define Stop Loss and Take Profit percentages to improved risk score.
								</li>
							</ul>
						</div>

					</div>
				</div>
			</div>
		</main>
	);
}
