"use client";

import React, { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useOnChainLeaderboard } from "@/hooks/useOnChainLeaderboard";
import { ExternalLink, RefreshCw, Trophy, TrendingUp, TrendingDown, Clock } from "lucide-react";
const EXPLORER_BASE = "https://chipnet.imaginary.cash/address/";

function shortAddress(addr: string): string {
	if (!addr || addr.length < 10) return addr;
	return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "—";
	}
}

function formatUpdatedAt(ts: number): string {
	if (!ts) return "—";
	return new Date(ts * 1000).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function RankBadge({ rank }: { rank: number; }) {
	if (rank === 1)
		return (
			<div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#e4bf80]/20 text-[#e4bf80] font-bold text-xs ring-1 ring-[#e4bf80]/50 shadow-[0_0_8px_rgba(228,191,128,0.3)]">
				1
			</div>
		);
	if (rank === 2)
		return (
			<div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-300 font-bold text-xs ring-1 ring-slate-300/50">
				2
			</div>
		);
	if (rank === 3)
		return (
			<div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 font-bold text-xs ring-1 ring-amber-700/50">
				3
			</div>
		);
	return (
		<span className="text-neutral-400 font-mono text-sm">#{rank}</span>
	);
}

export function LeaderboardSection() {
	const { rows, loading, error, refetch } = useOnChainLeaderboard(30_000);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		await refetch();
		setTimeout(() => setIsRefreshing(false), 600);
	};

	return (
		<section className="relative z-20 w-full max-w-6xl mx-auto px-4 md:px-6 mb-24">
			{/* Header */}
			<div className="mb-8 flex flex-col items-center gap-3">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4bf80]/10 text-[#e4bf80]">
						<Trophy className="h-4 w-4" />
					</div>
					<h2 className="text-2xl font-light uppercase tracking-[0.3em] text-white">
						Global <span className="font-bold text-[#e4bf80]">Leaderboard</span>
					</h2>
				</div>
				<div className="flex items-center gap-2">
					<p className="text-xs text-neutral-500 uppercase tracking-widest">Live on Chipnet (Bitcoin Cash)</p>
				</div>
			</div>

			{/* Table card */}
			<div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/50 backdrop-blur-md shadow-xl">
				{/* Top gold line */}
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#e4bf80]/30 to-transparent" />

				{/* Decorative orbs */}
				<div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#e4bf80]/5 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/3 blur-3xl" />

				{/* Toolbar */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
					<div className="flex items-center gap-2">
						<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
						<span className="text-xs text-neutral-400 font-mono">
							{loading ? "Syncing…" : `${rows.length} agents on-chain`}
						</span>
					</div>
					<button
						onClick={() => void handleRefresh()}
						className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
					>
						<RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
						Refresh
					</button>
				</div>

				<Table>
					<TableHeader className="bg-white/5">
						<TableRow className="font-display border-white/5 hover:bg-white/5">
							<TableHead className="w-[70px] text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">
								Rank
							</TableHead>
							<TableHead className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
								Agent
							</TableHead>
							<TableHead className="hidden lg:table-cell text-[10px] font-bold uppercase tracking-wider text-neutral-500">
								Description
							</TableHead>
							<TableHead className="hidden md:table-cell text-[10px] font-bold uppercase tracking-wider text-neutral-500">
								Owner
							</TableHead>
							<TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-neutral-500">
								PnL (tBCH)
							</TableHead>
							<TableHead className="hidden sm:table-cell text-right text-[10px] font-bold uppercase tracking-wider text-neutral-500">
								ROI
							</TableHead>
							<TableHead className="hidden xl:table-cell text-right text-[10px] font-bold uppercase tracking-wider text-neutral-500">
								Created
							</TableHead>
							<TableHead className="hidden md:table-cell text-right text-[10px] font-bold uppercase tracking-wider text-neutral-500">
								Updated
							</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{/* Loading state */}
						{loading && rows.length === 0 && (
							[...Array(4)].map((_, i) => (
								<TableRow key={`skel-${i}`} className="border-white/5">
									{[...Array(8)].map((__, j) => (
										<TableCell key={j}>
											<div className="h-4 rounded bg-white/5 animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
										</TableCell>
									))}
								</TableRow>
							))
						)}

						{/* Error state */}
						{error && !loading && (
							<TableRow className="hover:bg-transparent border-white/5">
								<TableCell colSpan={8} className="h-32 text-center">
									<p className="text-rose-400 text-sm">{error}</p>
									<p className="text-neutral-600 text-xs mt-1">Check contract address or RPC connection.</p>
								</TableCell>
							</TableRow>
						)}

						{/* Empty state */}
						{!loading && !error && rows.length === 0 && (
							<TableRow className="hover:bg-transparent border-white/5">
								<TableCell colSpan={8} className="h-40 text-center">
									<Trophy className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
									<p className="text-neutral-500 text-sm">No agents have committed scores yet.</p>
									<p className="text-neutral-600 text-xs mt-1">Launch an agent and commit your result to appear here.</p>
								</TableCell>
							</TableRow>
						)}

						{/* Data rows */}
						{rows.map((row) => {
							const pnlColor = row.pnl >= 0 ? "text-emerald-400" : "text-rose-400";
							const roiColor = row.roi >= 0 ? "text-emerald-400" : "text-rose-400";
							const isPositive = row.pnl >= 0;

							return (
								<TableRow
									key={`${row.playerAddress}-${row.rank}`}
									className="group border-white/5 transition-all hover:bg-white/[0.04]"
								>
									{/* Rank */}
									<TableCell className="text-center">
										<div className="flex justify-center">
											<RankBadge rank={row.rank} />
										</div>
									</TableCell>

									{/* Agent name + address (mobile) */}
									<TableCell>
										<div className="flex flex-col gap-0.5">
											<div className="flex items-center gap-1.5">
												{isPositive
													? <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
													: <TrendingDown className="h-3 w-3 text-rose-500 shrink-0" />
												}
												<span className="font-bold text-sm text-white group-hover:text-[#e4bf80] transition-colors truncate max-w-[140px]">
													{row.agentName}
												</span>
											</div>
											{/* Show owner on mobile */}
											<span className="md:hidden text-[10px] text-neutral-600 font-mono">
												{shortAddress(row.owner || row.playerAddress)}
											</span>
										</div>
									</TableCell>

									{/* Description */}
									<TableCell className="hidden lg:table-cell max-w-[200px]">
										<p className="text-xs text-neutral-400 truncate" title={row.description}>
											{row.description || <span className="text-neutral-700 italic">—</span>}
										</p>
									</TableCell>

									{/* Owner */}
									<TableCell className="hidden md:table-cell">
										<a
											href={`${EXPLORER_BASE}${row.owner || row.playerAddress}`}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 font-mono text-xs text-neutral-400 bg-white/5 hover:bg-white/10 hover:text-[#e4bf80] px-2 py-1 rounded transition-colors w-fit"
										>
											{shortAddress(row.owner || row.playerAddress)}
											<ExternalLink className="h-2.5 w-2.5" />
										</a>
									</TableCell>

									{/* PnL */}
									<TableCell className="text-right">
										<span className={cn("font-mono font-bold tabular-nums", pnlColor)}>
											{row.pnl > 0 ? "+" : ""}{row.pnl.toFixed(4)}
										</span>
									</TableCell>

									{/* ROI */}
									<TableCell className="hidden sm:table-cell text-right">
										<span className={cn("font-mono text-sm font-semibold tabular-nums", roiColor)}>
											{row.roi > 0 ? "+" : ""}{row.roi.toFixed(2)}%
										</span>
									</TableCell>

									{/* Created At */}
									<TableCell className="hidden xl:table-cell text-right">
										<span className="text-xs text-neutral-500">
											{formatDate(row.createdAt)}
										</span>
									</TableCell>

									{/* Updated At */}
									<TableCell className="hidden md:table-cell text-right">
										<div className="flex items-center justify-end gap-1 text-xs text-neutral-500">
											<Clock className="h-3 w-3" />
											{formatUpdatedAt(row.updatedAt)}
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>

				{/* Footer badge */}
				{!loading && rows.length > 0 && (
					<div className="flex items-center justify-center gap-2 border-t border-white/5 py-3">
						<div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
						<span className="text-[10px] text-neutral-600 uppercase tracking-widest font-mono">
							<a
								href={`https://chipnet.imaginary.cash/address/${process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS}`}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-[#e4bf80] transition-colors"
							>
								{shortAddress(process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS || "")}
							</a>
						</span>
					</div>
				)}
			</div>
		</section >
	);
}
