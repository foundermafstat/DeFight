"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FaWallet, FaArrowRotateRight, FaRightFromBracket } from "react-icons/fa6";
import { useGame, shortAddress } from "@/context/GameContext";
import { cn } from "@/lib/utils";
import { runSafeAction } from "@/lib/safe-action";

export function UserMenu() {
	const {
		authProfile,
		walletChainLabel,
		tbchBalance,
		tusdtBalance,
		tusdtSymbol,
		refreshBalances,
		logout,
		copyAddress,
	} = useGame();

	if (!authProfile) return null;

	const compactTusdtBalance = tusdtBalance.startsWith("Set ")
		? "Set token address"
		: tusdtBalance;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="group relative h-9 md:h-10 overflow-hidden rounded-xl bg-black/40 px-4 font-display text-xs font-bold uppercase tracking-[0.16em] text-neutral-300 transition-all duration-300 hover:bg-black/60 hover:text-white backdrop-blur-md"
				>
					<FaWallet className="mr-2 h-3.5 w-3.5 text-[#e4bf80]" />
					<span className="font-mono text-[11px] md:text-[13px] tracking-tight">
						{shortAddress(authProfile.address)}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				sideOffset={8}
				className="w-72 rounded-2xl border-none bg-black/60 p-2 backdrop-blur-xl"
			>
				<DropdownMenuLabel className="px-3 py-2.5 font-display text-[10px] uppercase tracking-[0.2em] text-[#8f97a3]/60">
					Profile
				</DropdownMenuLabel>

				<div className="px-1 mb-2">
					<div
						className="group flex w-full items-center justify-between rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
					>
						<span className="font-mono text-xs text-neutral-300 group-hover:text-white transition-colors">
							{shortAddress(authProfile.address)}
						</span>
						<Badge
							variant="secondary"
							className="rounded-lg bg-black/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e4bf80] cursor-pointer hover:bg-[#e4bf80] hover:text-black transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								void runSafeAction(copyAddress);
							}}
						>
							Copy
						</Badge>
					</div>
				</div>

				<div className="space-y-1 px-1">
					<div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
						<span className="font-display text-[10px] uppercase tracking-wider text-[#8f97a3]">Network</span>
						<span className="font-mono text-[10px] text-[#eff2f7]">{walletChainLabel}</span>
					</div>
					<div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
						<span className="font-display text-[10px] uppercase tracking-wider text-[#8f97a3]">tBCH Balance</span>
						<span className="font-mono text-[10px] text-[#eff2f7]">{tbchBalance}</span>
					</div>
					<div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
						<span className="font-display text-[10px] uppercase tracking-wider text-[#8f97a3]">{tusdtSymbol}</span>
						<span className="font-mono text-[10px] text-[#eff2f7]">{compactTusdtBalance}</span>
					</div>
				</div>

				<div className="mt-2 flex gap-2 p-1">
					<DropdownMenuItem
						className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-all focus:bg-white/10 focus:text-white focus:outline-none cursor-pointer"
						onClick={() => {
							void runSafeAction(() => refreshBalances());
						}}
					>
						<FaArrowRotateRight className="h-3 w-3" />
						Refresh
					</DropdownMenuItem>
					<DropdownMenuItem
						className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-rose-500/80 transition-all focus:bg-rose-500/20 focus:text-rose-400 focus:outline-none cursor-pointer hover:text-rose-400"
						onClick={() => {
							void runSafeAction(logout);
						}}
					>
						<FaRightFromBracket className="h-3 w-3" />
						Logout
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
