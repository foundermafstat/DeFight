"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { runSafeAction } from "@/lib/safe-action";
import {
	Sparkles,
	Play,
	Activity,
	Cpu,
	Shield,
	Zap,
	BarChart3,
	Terminal,
	Loader2,
	Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";


const TRADING_PAIRS = [
	{ symbol: "PEPEUSDT", name: "PEPE / USDT", volatility: "Extreme", prompt: "Monitor PEPE/USDT on 1m and 5m timeframes. Volatility is extreme. Look for sudden volume spikes > 300% average. Enter LONG on breakout above VWAP with RSI > 60. Take profit at 5% or trailing stop 1.5%. Stop loss tight at 2%." },
	{ symbol: "WIFUSDT", name: "WIF / USDT", volatility: "Extreme", prompt: "Aggressive scalping on WIF/USDT 1m chart. Enter LONG when price touches lower Bollinger Band and MACD histogram shows bullish divergence. Exit at middle band. Strict stop loss at 1.5%." },
	{ symbol: "DOGEUSDT", name: "DOGE / USDT", volatility: "High", prompt: "Track DOGE/USDT on 15m timeframe. Focus on momentum after Elon tweets (simulate with sudden social sentiment/volume surge). If price pumps > 2% in 5 mins and RSI crosses 70, enter SHORT for quick mean reversion. Take profit 2%, Stop loss 1%." },
	{ symbol: "SHIBUSDT", name: "SHIB / USDT", volatility: "High", prompt: "Momentum breakout on SHIB/USDT 5m chart. Wait for consolidation pattern. Enter LONG on high volume breakout above resistance. Target 3% profit, stop loss just below breakout candle." },
	{ symbol: "BCHUSDT", name: "BCH / USDT", volatility: "Medium", prompt: "Trend following on BCH/USDT 1h chart. Wait for 50 EMA to cross above 200 EMA (Golden Cross). Enter LONG on retest of 50 EMA. Target 3:1 Risk/Reward. Take profit at nearest major resistance, stop loss below recent swing low." },
	{ symbol: "BTCUSDT", name: "BTC / USDT", volatility: "Low", prompt: "Accumulation strategy on BTC/USDT 4h chart. Buy the dip. Enter LONG when daily RSI drops below 30 and price hits major support zone. Hold for 5% gain, stop loss at 3%." },
	{ symbol: "ETHUSDT", name: "ETH / USDT", volatility: "Low", prompt: "Swing strategy on ETH/USDT 2h chart. Identify ascending channels. Buy at the bottom of the channel, sell at the top. Stop loss 2% below the channel line." },
	{ symbol: "SOLUSDT", name: "SOL / USDT", volatility: "Medium", prompt: "Breakout strategy for SOL/USDT on 15m. Identify ascending triangles. Enter LONG on confirmed breakout above resistance with high volume. Take profit 4%, stop loss 1.5%." },
];

const STRATEGY_PRESETS = [
	{
		name: "Scalping Breakout",
		prompt: "Ultra-fast scalping on 1m chart. Monitor order book for large spoofed walls. Enter LONG when resistance breaks with 5x average volume. Target 0.5% profit, 0.2% strict stop loss. Max hold time 5 minutes.",
		icon: Zap
	},
	{
		name: "Trend Following",
		prompt: "Swing trading on 4h timeframe. Confirm trend with ADX > 25. Enter LONG when price pulls back to the 20 EMA in an uptrend. Hold until price closes below 20 EMA or MACD bearish cross. No hard take profit, use trailing stop to ride the trend.",
		icon: Activity
	},
	{
		name: "Mean Reversion",
		prompt: "Contrarian strategy on 15m timeframe. Look for extreme deviations from the mean. Enter SHORT when price is > 3 ATR above the 20 SMA and RSI > 85. Target return to the 20 SMA. Stop loss if price closes above entry candle high.",
		icon: BarChart3
	}
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
		savePromptModel,
		evolvePromptModel,
	} = useGame();

	const router = useRouter();
	const [depositAmount, setDepositAmount] = useState("0.01");
	const [isEvolving, setIsEvolving] = useState(false);
	const [shortDescription, setShortDescription] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);

	const generateFullPrompt = async () => {
		if (!shortDescription.trim()) return;
		setIsGenerating(true);
		try {
			const desc = shortDescription.trim();
			// Generate a comprehensive trading strategy prompt from the short description
			const generatedPrompt = [
				`You are "${agentName || 'Trading Agent'}" — an autonomous AI trading agent designed for BCH/USDT on Chipnet.`,
				``,
				`Core Strategy: ${desc}`,
				``,
				`You receive:`,
				`  • market (price, volume, bid/ask spread, 24h change)`,
				`  • portfolio (baseBalance: BCH, quoteBalance: USDT)`,
				``,
				`EXECUTION RULES:`,
				`1. ANALYZE market conditions using RSI(14), MACD(12,26,9), Bollinger Bands(20,2), and EMA(50/200).`,
				`2. CALCULATE position size: never risk more than 5% of total portfolio per trade.`,
				`3. ENTRY CONDITIONS:`,
				`   - BUY when ${desc.toLowerCase().includes('buy') ? desc : 'multiple indicators confirm bullish momentum and price shows strength above key moving averages'}.`,
				`   - SELL when ${desc.toLowerCase().includes('sell') ? desc : 'bearish divergence appears or price breaks below support with increasing volume'}.`,
				`4. RISK MANAGEMENT:`,
				`   - Stop Loss: 2% below entry for LONG, 2% above for SHORT.`,
				`   - Take Profit: 3:1 reward-to-risk ratio minimum.`,
				`   - Trailing Stop: Activate at 1.5% profit, trail by 0.8%.`,
				`5. POSITION SIZING:`,
				`   - Conservative: 10-20% of available quote balance per trade.`,
				`   - Scale in: Add 50% more on confirmed breakout continuation.`,
				`6. HOLD if no clear signal. Capital preservation is priority.`,
				``,
				`RESPOND with valid JSON: { "action": "BUY"|"SELL"|"HOLD", "confidence": 0-100, "reason": "...", "amount": number }`,
			].join('\n');

			setStrategy(generatedPrompt);
			if (!agentName) {
				// Auto-generate a name from the description
				const words = desc.split(' ').filter(w => w.length > 2).slice(0, 2);
				setAgentName(words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Bot');
			}
		} finally {
			setIsGenerating(false);
		}
	};


	const handleLaunch = async () => {
		await launchAgent(depositAmount);
		router.push("/live");
	};

	const handleEvolve = async () => {
		setIsEvolving(true);
		try {
			const savedModel = await savePromptModel({
				modelName: agentName,
				description: shortDescription,
				prompt: strategy,
				symbol: "BCHUSDT",
				settings: {
					cycles,
					intervalMs: 1000,
					source: "solo",
				}
			});

			// Call /evolve endpoint
			const { evolutionResult, model } = await evolvePromptModel(savedModel.id);

			if (evolutionResult.bestShadow) {
				// Update UI state with the mutated prompt
				setStrategy(evolutionResult.bestShadow.description || model.prompt);
				// Optionally re-run analysis automatically
				setTimeout(analyzeCurrentPrompt, 500);
			} else {
				alert("No mutation was able to beat the original PnL.");
			}

		} catch (error) {
			console.error("Evolution failed:", error);
			alert("Evolution failed: " + (error as Error).message);
		} finally {
			setIsEvolving(false);
		}
	};

	return (
		<main className="relative min-h-screen w-full overflow-hidden pt-24 pb-20">
			{/* Ambient Background Effects */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-neutral-950 to-neutral-950" />
			<div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[#0AC18E]/20 to-transparent" />

			<div className="mx-auto max-w-7xl px-6 lg:px-8">

				{/* Header Section */}
				<div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="font-display text-4xl font-bold uppercase tracking-wide text-white">
							Agent <span className="text-[#0AC18E]">Forge</span>
						</h1>
						<p className="mt-2 max-w-xl text-neutral-400">
							Architect your autonomous trading strategy using natural language.
							Define parameters, risk controls, and execution logic.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

					{/* Left Column: Configuration */}
					<div className="lg:col-span-8 flex flex-col gap-6">



						{/* Strategy Editor Panel */}
						<div className="relative rounded-2xl border border-white/5 bg-[#121418] p-1 shadow-2xl">
							<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

							<div className="relative rounded-xl bg-neutral-900/50 p-6 backdrop-blur-sm">
								<div className="mb-6 flex items-center">
									<div className="flex items-center gap-2">
										<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0AC18E]/10 text-[#0AC18E]">
											<Cpu className="h-4 w-4" />
										</div>
										<h3 className="font-display text-lg font-medium text-white uppercase tracking-wide">Agent Configuration</h3>
									</div>
								</div>

								<div className="space-y-6">
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Shield className="h-3 w-3" /> Agent Designation
											</label>
											<Input
												className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#0AC18E]/50 focus:ring-[#0AC18E]/20 h-11"
												placeholder="e.g. TrendMaster Alpha"
												value={agentName}
												onChange={(e) => setAgentName(e.target.value)}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
												<Wand2 className="h-3 w-3" /> Short Description
											</label>
											<div className="flex gap-2">
												<Input
													className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#0AC18E]/50 focus:ring-[#0AC18E]/20 h-11 flex-1"
													placeholder="e.g. Buy dips, ride momentum"
													value={shortDescription}
													onChange={(e) => setShortDescription(e.target.value)}
													onKeyDown={(e) => { if (e.key === 'Enter') void generateFullPrompt(); }}
												/>
												<Button
													type="button"
													className="h-11 px-4 bg-[#0AC18E]/10 border border-[#0AC18E]/30 text-[#0AC18E] hover:bg-[#0AC18E]/20 text-[10px] uppercase tracking-wider font-bold shrink-0"
													disabled={isGenerating || !shortDescription.trim()}
													onClick={() => void generateFullPrompt()}
												>
													{isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
												</Button>
											</div>
											<p className="text-[10px] text-neutral-600">Write a brief idea and press the button to generate a full strategy prompt</p>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
											<Terminal className="h-3 w-3" /> Strategy Directive
										</label>
										<div className="relative">
											<Textarea
												className="min-h-[320px] resize-none border-white/10 bg-black/20 p-4 pb-10 text-sm leading-relaxed text-neutral-200 placeholder:text-transparent focus:border-[#0AC18E]/50 focus:ring-[#0AC18E]/20 font-mono"
												value={strategy}
												onChange={(e) => setStrategy(e.target.value)}
											/>
											<div className="absolute bottom-3 right-3 text-[10px] text-neutral-600 font-mono bg-black/40 px-2 py-1 rounded pointer-events-none">
												{strategy.length} chars
											</div>
										</div>
									</div>



									<div className="mt-6 flex flex-wrap gap-3 justify-end items-center">
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
											variant="outline"
											disabled={isEvolving}
											onClick={() => {
												void runSafeAction(handleEvolve);
											}}
											className="border-[#0AC18E]/50 bg-[#0AC18E]/10 text-[#0AC18E] hover:bg-[#0AC18E]/20 h-11 uppercase tracking-wider text-xs font-bold px-6"
										>
											{isEvolving ? (
												<Activity className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Zap className="mr-2 h-3.5 w-3.5" />
											)}
											{isEvolving ? "Evolving..." : "Evolve AI"}
										</Button>
										<Button
											type="button"
											className="bg-[#0AC18E] text-black hover:bg-[#cda460] h-11 uppercase tracking-wider text-xs font-bold px-8 shadow-[0_0_20px_rgba(228,191,128,0.2)] hover:shadow-[0_0_30px_rgba(228,191,128,0.4)] transition-all"
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
											<div className="absolute inset-0 bg-[#0AC18E] blur-xl opacity-20 animate-pulse" />
											<Sparkles className="h-12 w-12 text-[#0AC18E] relative z-10" />
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
														stroke="#0AC18E"
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
								<Sparkles className="h-3 w-3 text-[#0AC18E]" /> Pro Tips
							</h4>
							<ul className="space-y-3">
								<li className="flex gap-3 text-xs text-neutral-500 leading-relaxed">
									<span className="h-1.5 w-1.5 rounded-full bg-[#0AC18E] mt-1.5 shrink-0" />
									Include specific technical indicators (RSI, MACD, Bollinger Bands) for better precision.
								</li>
								<li className="flex gap-3 text-xs text-neutral-500 leading-relaxed">
									<span className="h-1.5 w-1.5 rounded-full bg-[#0AC18E] mt-1.5 shrink-0" />
									Explicitly define Stop Loss and Take Profit percentages to improved risk score.
								</li>
							</ul>
						</div>

					</div>
				</div>
			</div>
		</main >
	);
}
