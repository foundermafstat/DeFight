"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Terminal,
	Swords,
	Zap,
	Timer,
	ArrowLeft,
	Trophy,
	Users,
	KeySquare,
	Loader2
} from "lucide-react";
import { useGame, formatClock } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { runSafeAction } from "@/lib/safe-action";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ArenaPage() {
	const {
		duelTimeLeft,
		leftAgentKey,
		setLeftAgentKey,
		rightAgentKey,
		setRightAgentKey,
		agentOptions,
		startDuel,
		duelId,
		duelWinner,
		duelLeft,
		duelRight,
		arenaLeftLogs,
		arenaRightLogs,
		arenaChartData,
		enterTournament
	} = useGame();

	const router = useRouter();

	const [isEnteringTournament, setIsEnteringTournament] = useState(false);
	const [tournamentTxId, setTournamentTxId] = useState("");
	const [entrySuccess, setEntrySuccess] = useState(false);

	return (
		<main className="relative min-h-screen w-full overflow-hidden pt-24 pb-20">
			{/* Ambient Background Effects */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-neutral-950 to-neutral-950" />
			<div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[#0AC18E]/20 to-transparent" />

			<div className="mx-auto max-w-[1700px] space-y-6 px-4 pb-4 pt-2 md:px-8 xl:px-10">

				{/* Header */}
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="font-display text-4xl font-bold uppercase tracking-wide text-white">
							Battle <span className="text-[#0AC18E]">Arena</span>
						</h1>
						<p className="mt-2 max-w-xl text-neutral-400">
							Synchronized PvP environments. Pit agents against each other
							to test strategy dominance in real-time market conditions.
						</p>
					</div>

					<Button
						type="button"
						variant="ghost"
						className="text-neutral-400 hover:text-white"
						onClick={() => router.push("/live")}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Live Feed
					</Button>
				</div>

				{/* Control Panel */}
				<section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#121418] p-1">
					<div className="relative rounded-xl bg-neutral-900/50 p-6 backdrop-blur-md">
						<div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0AC18E]/10 text-[#0AC18E]">
									<Swords className="h-5 w-5" />
								</div>
								<div>
									<h2 className="font-display text-lg font-bold text-white uppercase tracking-wide">Duel Configuration</h2>
									<p className="text-sm text-neutral-500">Select combatants for a 15-minute simulation.</p>
								</div>
							</div>

							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-4 py-2">
									<Timer className="h-4 w-4 text-[#0AC18E]" />
									<span className={`font-mono font-bold ${duelTimeLeft !== "00:00" ? 'text-white' : 'text-neutral-500'}`}>
										{duelTimeLeft}
									</span>
								</div>

								<div className="h-8 w-px bg-white/10 hidden xl:block"></div>

								{duelWinner ? (
									<div className="flex items-center gap-2 text-emerald-400 animate-in fade-in slide-in-from-right duration-500">
										<Trophy className="h-4 w-4" />
										<span className="font-display font-bold uppercase">{duelWinner} WINS</span>
									</div>
								) : (
									<span className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Ready to Start</span>
								)}
							</div>
						</div>

						<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto_1fr] items-end">
							<div className="space-y-2">
								<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
									<Users className="h-3 w-3" /> Challenger (Left)
								</label>
								<Select value={leftAgentKey} onValueChange={(value) => setLeftAgentKey(value)}>
									<SelectTrigger className="h-11 border-white/10 bg-black/20 text-white focus:ring-[#0AC18E]/20">
										<SelectValue placeholder="Select left agent" />
									</SelectTrigger>
									<SelectContent className="border-neutral-800 bg-[#1a1d21] text-neutral-200">
										{agentOptions.map((option) => (
											<SelectItem key={option.key} value={option.key} className="focus:bg-white/5 focus:text-[#0AC18E]">
												{option.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex justify-center pb-1">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neutral-600 font-display font-bold text-xs">VS</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1.5">
									<Users className="h-3 w-3" /> Opponent (Right)
								</label>
								<Select value={rightAgentKey} onValueChange={(value) => setRightAgentKey(value)}>
									<SelectTrigger className="h-11 border-white/10 bg-black/20 text-white focus:ring-[#0AC18E]/20">
										<SelectValue placeholder="Select right agent" />
									</SelectTrigger>
									<SelectContent className="border-neutral-800 bg-[#1a1d21] text-neutral-200">
										{agentOptions.map((option) => (
											<SelectItem key={option.key} value={option.key} className="focus:bg-white/5 focus:text-[#0AC18E]">
												{option.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="mt-8 flex flex-col md:flex-row justify-center gap-4">
							<Button
								type="button"
								className="bg-[#0AC18E] text-black hover:bg-[#cda460] px-12 h-11 uppercase tracking-wider font-bold shadow-[0_0_20px_rgba(228,191,128,0.2)] hover:shadow-[0_0_30px_rgba(228,191,128,0.4)] transition-all"
								onClick={() => {
									void runSafeAction(startDuel);
								}}
							>
								<Zap className="mr-2 h-4 w-4" />
								Initiate Duel Protocol
							</Button>

							<div className="flex gap-2">
								<Input
									placeholder="Escrow TxID (from electrum etc)"
									className="border-white/10 bg-black/20 text-white placeholder:text-neutral-700 focus:border-[#0AC18E]/50 focus:ring-[#0AC18E]/20 h-11 w-64"
									value={tournamentTxId}
									onChange={(e) => setTournamentTxId(e.target.value)}
									disabled={isEnteringTournament || entrySuccess}
								/>
								<Button
									type="button"
									className="bg-transparent border border-[#0AC18E] text-[#0AC18E] hover:bg-[#0AC18E]/10 px-8 h-11 uppercase tracking-wider font-bold transition-all"
									disabled={!leftAgentKey || !tournamentTxId || isEnteringTournament || entrySuccess}
									onClick={async () => {
										if (!leftAgentKey || !tournamentTxId) return;
										setIsEnteringTournament(true);
										try {
											await enterTournament(leftAgentKey, tournamentTxId);
											setEntrySuccess(true);
										} catch (e) {
											// context handles error toast
										} finally {
											setIsEnteringTournament(false);
										}
									}}
								>
									{isEnteringTournament ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeySquare className="mr-2 h-4 w-4" />}
									{entrySuccess ? "Entered" : "Enter Tournament (Left Bot)"}
								</Button>
							</div>
						</div>

						<div className="mt-4 flex justify-center">
							<p className="text-[10px] text-neutral-600 font-mono">
								SESSION ID: {duelId || "Waiting for initialization..."}
							</p>
						</div>
					</div>
				</section>

				{/* Battle View */}
				<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

					{/* Left Terminal */}
					<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] p-1 flex flex-col h-[400px]">
						<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#0AC18E]/30 to-transparent" />
						<div className="relative flex-1 bg-black/40 p-4 font-mono text-xs flex flex-col">
							<div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2">
								<div className="flex items-center gap-2 text-[#0AC18E]">
									<Terminal className="h-4 w-4" />
									<span className="uppercase tracking-widest font-bold text-[10px]">{duelLeft?.agentName || "LEFT AGENT"}</span>
								</div>
								<div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
							</div>

							<ScrollArea className="flex-1 pr-4">
								{arenaLeftLogs.length === 0 ? (
									<div className="flex h-full items-center justify-center text-neutral-800">
										<p>Awaiting combat logs...</p>
									</div>
								) : (
									<div className="space-y-1.5">
										{arenaLeftLogs.map((log, idx) => (
											<div key={`${log.timestamp}-${idx}`} className="flex gap-2 text-neutral-300">
												<span className="text-neutral-600 shrink-0">[{formatClock(log.timestamp)}]</span>
												<span className="text-[#0AC18E]">{log.message}</span>
											</div>
										))}
									</div>
								)}
							</ScrollArea>
						</div>
					</div>

					{/* Right Terminal */}
					<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] p-1 flex flex-col h-[400px]">
						<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#0AC18E]/30 to-transparent" />
						<div className="relative flex-1 bg-black/40 p-4 font-mono text-xs flex flex-col">
							<div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2">
								<div className="flex items-center gap-2 text-neutral-400">
									<Terminal className="h-4 w-4" />
									<span className="uppercase tracking-widest font-bold text-[10px]">{duelRight?.agentName || "RIGHT AGENT"}</span>
								</div>
								<div className="h-1.5 w-1.5 rounded-full bg-neutral-600"></div>
							</div>

							<ScrollArea className="flex-1 pr-4">
								{arenaRightLogs.length === 0 ? (
									<div className="flex h-full items-center justify-center text-neutral-800">
										<p>Awaiting combat logs...</p>
									</div>
								) : (
									<div className="space-y-1.5">
										{arenaRightLogs.map((log, idx) => (
											<div key={`${log.timestamp}-${idx}`} className="flex gap-2 text-neutral-300">
												<span className="text-neutral-600 shrink-0">[{formatClock(log.timestamp)}]</span>
												<span className="text-neutral-400">{log.message}</span>
											</div>
										))}
									</div>
								)}
							</ScrollArea>
						</div>
					</div>
				</div>

				{/* PnL Overlay Chart */}
				<section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#121418] p-1">
					<div className="relative rounded-xl bg-neutral-900/50 p-6 backdrop-blur-md">
						<div className="mb-6 flex items-center gap-2 text-white">
							<Swords className="h-4 w-4 text-[#0AC18E]" />
							<h3 className="font-display text-sm font-bold uppercase tracking-wide">Comparative Performance</h3>
						</div>

						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={arenaChartData} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
									<XAxis
										dataKey="time"
										stroke="#525252"
										fontSize={10}
										tickLine={false}
										axisLine={false}
										tickMargin={8}
									/>
									<YAxis
										stroke="#525252"
										fontSize={10}
										tickLine={false}
										axisLine={false}
										tickFormatter={(value) => `${value}%`}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "#171717",
											borderColor: "#262626",
											borderRadius: "8px",
											color: "#fff",
											fontSize: "12px",
											boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
										}}
									/>
									<Line
										type="monotone"
										dataKey="left"
										stroke="#0AC18E"
										strokeWidth={2}
										dot={false}
										name={duelLeft?.agentName || "Left Agent"}
									/>
									<Line
										type="monotone"
										dataKey="right"
										stroke="#a3a3a3"
										strokeWidth={2}
										dot={false}
										strokeDasharray="5 5"
										name={duelRight?.agentName || "Right Agent"}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
