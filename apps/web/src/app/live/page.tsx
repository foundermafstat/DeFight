"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
	CartesianGrid,
	Area,
	AreaChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Terminal,
	Activity,
	Trophy,
	Wallet,
	Cpu,
	Globe,
	Zap,
	ArrowUpRight,
	ExternalLink,
	Loader2,
	X,
} from "lucide-react";
import { useGame, formatClock, formatDate, shortAddress } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { runSafeAction } from "@/lib/safe-action";
const EXPLORER_BASE = "https://chipnet.imaginary.cash/tx/";

type StopResult = {
	finalPnl: number;
	roiPct: number;
	txHash: string;
};

export default function LivePage() {
	const {
		agentName,
		portfolio,
		marketPrice,
		commitToLeaderboard,
		runId,
		commitStatus,
		soloLogs,
		liveSeries,
		leaderboard,
		stopAgent,
		agentStopped,
		finalPnl,
		finalRoiPct,
	} = useGame();

	const router = useRouter();
	const [isStopping, setIsStopping] = useState(false);
	const [stopResult, setStopResult] = useState<StopResult | null>(null);

	const handleStop = async () => {
		setIsStopping(true);
		try {
			const result = await stopAgent();
			setStopResult({
				finalPnl: result.finalPnl,
				roiPct: result.roiPct,
				txHash: result.txHash,
			});
		} catch {
			// error handled by runSafeAction / context toast
		} finally {
			setIsStopping(false);
		}
	};

	return (
		<main className="relative h-screen w-full overflow-hidden pt-16 pb-4">
			{/* Ambient Background Effects */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-neutral-950 to-neutral-950" />
			<div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[#e4bf80]/20 to-transparent" />

			<div className="mx-auto max-w-[1700px] h-[calc(100vh-5rem)] flex flex-col gap-3 px-4 md:px-8 xl:px-10">

				{/* Header */}
				<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between shrink-0">
					<div className="flex items-center gap-3">
						<h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
							Live <span className="text-[#e4bf80]">Feed</span>
						</h1>
						<div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 backdrop-blur-sm">
							<div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
							<span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">Live</span>
						</div>
					</div>
				</div>

				<section className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_300px] xl:grid-cols-[280px_1fr_320px] flex-1 min-h-0">

					{/* Left: Agent Stats */}
					<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#121418] p-1 flex flex-col min-h-0">
						<div className="relative flex-1 rounded-xl bg-neutral-900/50 p-3 backdrop-blur-md flex flex-col min-h-0">
							<div className="flex items-center gap-2 mb-3">
								<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e4bf80]/10 text-[#e4bf80]">
									<Cpu className="h-3.5 w-3.5" />
								</div>
								<h3 className="font-display text-sm font-medium text-white uppercase tracking-wide">Active Agent</h3>
							</div>

							<div className="space-y-2 overflow-auto flex-1 min-h-0">
								<div className="rounded-lg border border-white/5 bg-white/5 p-3">
									<p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Designation</p>
									<p className="text-white font-medium truncate text-sm" title={agentName}>{agentName || "No Agent Active"}</p>
								</div>

								<div className="grid grid-cols-1 gap-2">
									{/* PnL block: shows live estimate during session, final after stop */}
									<div className="rounded-lg border border-white/5 bg-white/5 p-3">
										{agentStopped && finalPnl !== null ? (
											<>
												<p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Final PnL ✓</p>
												<p className={`font-mono text-lg font-bold ${finalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
													{finalPnl >= 0 ? '+' : ''}{finalPnl.toFixed(4)} <span className="text-xs text-neutral-500 font-normal">USDT</span>
												</p>
											</>
										) : (
											<>
												<p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Live PnL <span className="text-neutral-600 normal-case font-normal">(est.)</span></p>
												<p className={`font-mono text-lg font-bold ${portfolio.pnl >= 0 ? 'text-[#e4bf80]' : 'text-rose-400'}`}>
													{portfolio.pnl >= 0 ? '+' : ''}{portfolio.pnl.toFixed(2)} <span className="text-xs text-neutral-500 font-normal">USDT</span>
												</p>
											</>
										)}
									</div>
									{/* ROI block (only after final stop) */}
									{agentStopped && finalRoiPct !== null && (
										<div className="rounded-lg border border-white/5 bg-white/5 p-3">
											<p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Final ROI ✓</p>
											<p className={`font-mono text-lg font-bold ${finalRoiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
												{finalRoiPct >= 0 ? '+' : ''}{finalRoiPct.toFixed(2)}%
											</p>
										</div>
									)}
									<div className="rounded-lg border border-white/5 bg-white/5 p-3">
										<p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Liquidity</p>
										<div className="flex flex-col gap-0.5">
											<p className="font-mono text-sm text-white">
												{portfolio.quoteBalance.toFixed(2)} <span className="text-neutral-500">USDT</span>
											</p>
											<p className="font-mono text-sm text-white">
												{portfolio.baseBalance.toFixed(4)} <span className="text-neutral-500">BCH</span>
											</p>
										</div>
									</div>

									<div className="rounded-lg border border-white/5 bg-white/5 p-3 flex items-center justify-between">
										<p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">BCH/USDT</p>
									</div>
									<Activity className="h-4 w-4 text-neutral-600" />
								</div>
							</div>

							<div className="mt-auto pt-3 space-y-2 shrink-0">
								<Button
									type="button"
									className="w-full bg-[#10b981] hover:bg-[#059669] text-black font-bold uppercase tracking-wider text-xs h-8 disabled:opacity-40 disabled:cursor-not-allowed"
									disabled={!agentStopped || finalPnl === null}
									title={!agentStopped ? "Stop the agent first to get verified results" : "Commit verified results to blockchain"}
									onClick={() => {
										void runSafeAction(commitToLeaderboard);
									}}
								>
									<Trophy className="mr-2 h-3 w-3" />
									{agentStopped ? "Commit Log" : "Stop First"}
								</Button>
								<Button type="button" variant="outline" className="w-full border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white uppercase tracking-wider text-xs h-8" onClick={() => router.push("/arena")}>
									View Arena
									<ArrowUpRight className="ml-2 h-3 w-3" />
								</Button>
								<Button
									type="button"
									variant="destructive"
									className="w-full bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-900/30 uppercase tracking-wider text-xs h-8 mt-1"
									disabled={isStopping}
									onClick={() => void runSafeAction(handleStop)}
								>
									{isStopping ? (
										<>
											<Loader2 className="mr-2 h-3 w-3 animate-spin" />
											Stopping...
										</>
									) : (
										"Stop & Refund"
									)}
								</Button>
							</div>

							<div className="mt-3 pt-2 border-t border-white/5 shrink-0">
								<div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
									<span>ID: {runId ? runId.slice(0, 6) : "---"}</span>
									<span className={commitStatus === "idle" ? "text-neutral-500" : "text-emerald-400"}>
										{commitStatus}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Middle: Terminal Console */}
					<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] p-1 flex flex-col min-h-0">
						<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#e4bf80]/30 to-transparent" />
						<div className="relative flex-1 bg-black/40 p-3 font-mono text-xs flex flex-col min-h-0">
							<div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
								<div className="flex items-center gap-2 text-[#e4bf80]">
									<Terminal className="h-4 w-4" />
									<span className="uppercase tracking-widest font-bold text-[10px]">System Output</span>
								</div>
								<div className="flex gap-1.5">
									<div className="h-2 w-2 rounded-full bg-red-500/20"></div>
									<div className="h-2 w-2 rounded-full bg-yellow-500/20"></div>
									<div className="h-2 w-2 rounded-full bg-green-500/20"></div>
								</div>
							</div>

							<ScrollArea className="flex-1 pr-4 min-h-0">
								{soloLogs.length === 0 ? (
									<div className="flex h-full items-center justify-center text-neutral-700">
										<p>Waiting for agent signals...</p>
									</div>
								) : (
									<div className="space-y-1">
										{/* Blinking cursor at top = newest position */}
										{!agentStopped && (
											<div className="h-3 mb-1 animate-pulse w-2.5 bg-[#e4bf80]"></div>
										)}
										{soloLogs.map((log, idx) => (
											<div key={`${log.timestamp}-${idx}`} className="flex gap-2 text-neutral-300 hover:bg-white/5 p-1 rounded transition-colors group items-start">
												<span className="text-neutral-600 shrink-0 select-none">[{formatClock(log.timestamp)}]</span>
												<span className="group-hover:text-[#e4bf80] transition-colors flex-1 break-all">{log.message}</span>
												{log.txHash && (
													<a
														href={`${EXPLORER_BASE}${log.txHash}`}
														target="_blank"
														title="View transaction on Chipnet Explorer"
													>
														<ExternalLink className="h-3 w-3" />
													</a>
												)}
											</div>
										))}
									</div>
								)}
							</ScrollArea>
						</div>
					</div>

					{/* Right: Chart & Leaderboard */}
					<div className="flex flex-col gap-3 min-h-0">

						{/* PnL Chart */}
						<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#121418] p-1 h-[200px] shrink-0">
							<div className="relative h-full rounded-xl bg-neutral-900/50 p-3 backdrop-blur-md flex flex-col">
								<div className="flex items-center gap-2 mb-1 text-white shrink-0">
									<Activity className="h-3.5 w-3.5 text-[#e4bf80]" />
									<h3 className="font-display text-xs font-bold uppercase tracking-wide">Performance Metric</h3>
								</div>

								<div className="flex-1 w-full -ml-3 min-h-0">
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart data={liveSeries} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
											<defs>
												<linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor="#e4bf80" stopOpacity={0.3} />
													<stop offset="95%" stopColor="#e4bf80" stopOpacity={0} />
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
											<XAxis
												dataKey="time"
												stroke="#525252"
												fontSize={9}
												tickLine={false}
												axisLine={false}
												tickMargin={4}
											/>
											<YAxis
												stroke="#525252"
												fontSize={9}
												tickLine={false}
												axisLine={false}
												tickFormatter={(value) => `$${value}`}
											/>
											<Tooltip
												contentStyle={{
													backgroundColor: "#171717",
													borderColor: "#262626",
													borderRadius: "8px",
													color: "#fff",
													fontSize: "11px",
													boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
												}}
												itemStyle={{ color: "#e4bf80" }}
											/>
											<Area
												type="monotone"
												dataKey="pnl"
												stroke="#e4bf80"
												strokeWidth={2}
												fillOpacity={1}
												fill="url(#colorPnl)"
											/>
										</AreaChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>

						{/* Leaderboard Table */}
						<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#121418] p-1 flex-1 min-h-0">
							<div className="relative h-full rounded-xl bg-neutral-900/50 backdrop-blur-md flex flex-col">
								<div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0">
									<div className="flex items-center gap-2 text-white">
										<Globe className="h-3.5 w-3.5 text-[#e4bf80]" />
										<h3 className="font-display text-xs font-bold uppercase tracking-wide">Global Rankings</h3>
									</div>
									<div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
								</div>

								<div className="flex-1 overflow-auto min-h-0">
									<Table>
										<TableHeader className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
											<TableRow className="border-white/5 hover:bg-transparent">
												<TableHead className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold h-7">Rank</TableHead>
												<TableHead className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold h-7">Agent</TableHead>
												<TableHead className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold h-7 text-right">PnL</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{leaderboard.length === 0 && (
												<TableRow className="border-white/5 hover:bg-transparent">
													<TableCell className="text-center text-xs text-neutral-500 py-4" colSpan={3}>
														No entries recorded yet.
													</TableCell>
												</TableRow>
											)}
											{leaderboard.slice(0, 10).map((row) => (
												<TableRow key={row.playerAddress} className="border-white/5 hover:bg-white/5 transition-colors group">
													<TableCell className="font-display text-[#e4bf80] text-sm py-1.5">#{row.rank}</TableCell>
													<TableCell className="py-1.5">
														<div className="flex flex-col">
															<span className="text-xs text-neutral-200 font-medium group-hover:text-white">{row.agentName}</span>
															<span className="text-[10px] text-neutral-500 font-mono">{shortAddress(row.playerAddress)}</span>
														</div>
													</TableCell>
													<TableCell className="text-right py-1.5">
														<span className={`font-mono font-bold text-sm ${row.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
															{row.pnl.toFixed(2)}
														</span>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						</div>

					</div>
				</section >
			</div >

			{/* Stop Result Modal */}
			{
				stopResult && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
						<div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#121418] p-1 shadow-2xl">
							<div className="rounded-xl bg-neutral-900/80 p-6 backdrop-blur-md">
								{/* Close button */}
								<button
									onClick={() => setStopResult(null)}
									className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
								>
									<X className="h-5 w-5" />
								</button>

								{/* Header */}
								<div className="flex items-center gap-3 mb-6">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4bf80]/10 text-[#e4bf80]">
										<Trophy className="h-5 w-5" />
									</div>
									<div>
										<h2 className="font-display text-lg font-bold text-white uppercase tracking-wide">Trading Complete</h2>
										<p className="text-xs text-neutral-400">{agentName}</p>
									</div>
								</div>

								{/* Stats */}
								<div className="space-y-3 mb-6">
									<div className="rounded-lg border border-white/5 bg-white/5 p-4 flex items-center justify-between">
										<span className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Final PnL</span>
										<span className={`font-mono text-xl font-bold ${stopResult.finalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
											{stopResult.finalPnl >= 0 ? '+' : ''}{stopResult.finalPnl.toFixed(4)} <span className="text-xs text-neutral-500 font-normal">USDT</span>
										</span>
									</div>

									<div className="rounded-lg border border-white/5 bg-white/5 p-4 flex items-center justify-between">
										<span className="text-xs uppercase tracking-wider text-neutral-500 font-bold">ROI</span>
										<span className={`font-mono text-xl font-bold ${stopResult.roiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
											{stopResult.roiPct >= 0 ? '+' : ''}{stopResult.roiPct.toFixed(2)}%
										</span>
									</div>

									{stopResult.txHash && (
										<div className="rounded-lg border border-white/5 bg-white/5 p-4">
											<p className="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-2">Refund Transaction</p>
											<a
												href={`${EXPLORER_BASE}${stopResult.txHash}`}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 text-[#e4bf80] hover:text-[#f0d49a] transition-colors font-mono text-xs"
											>
												{stopResult.txHash.slice(0, 10)}...{stopResult.txHash.slice(-8)}
												<ExternalLink className="h-3 w-3" />
											</a>
										</div>
									)}
								</div>

								{/* Close button */}
								<Button
									type="button"
									className="w-full bg-white/10 hover:bg-white/20 text-white uppercase tracking-wider text-xs h-9"
									onClick={() => setStopResult(null)}
								>
									Close
								</Button>
							</div>
						</div>
					</div>
				)
			}
		</main >
	);
}
