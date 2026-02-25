"use client";

import { useMemo, useEffect, useState } from "react";
import { ScrollChoreographyHero } from "@/components/home/hero/ScrollChoreographyHero";
import { AnatomyOfPowerSection } from "@/components/home/anatomy/AnatomyOfPowerSection";
import { LeaderboardSection } from "@/components/home/leaderboard/LeaderboardSection";
import { AgentPromptCardEntity } from "@/components/home/hero/types";
import { useGame, shortAddress, SavedPromptModel } from "@/context/GameContext";
import { runSafeAction } from "@/lib/safe-action";
import { useRouter } from "next/navigation";

const FALLBACK_PROMPTS = [
	"Adaptive trend strategy with strict stop-loss and reduced leverage during volatility spikes.",
	"Mean-reversion strategy: buy oversold zones, scale out gradually, keep max drawdown under 3%.",
	"Breakout strategy with momentum confirmation and hard risk cap per position.",
];

export default function WelcomePage() {
	const {
		isAuthenticated,
		authProfile,
		walletAddress,
		walletChainLabel,
		connectWalletAndAuthenticate,
		agentName,
		strategy,
		portfolio,
		runId,
		leaderboard,
		agentOptions,
		listFeaturedModels,
	} = useGame();

	const router = useRouter();

	const [featuredModels, setFeaturedModels] = useState<SavedPromptModel[]>([]);

	useEffect(() => {
		let mounted = true;
		listFeaturedModels().then((models) => {
			if (mounted && models.length > 0) {
				setFeaturedModels(models);
			}
		});
		return () => {
			mounted = false;
		};
	}, [listFeaturedModels]);

	const heroCards = useMemo<AgentPromptCardEntity[]>(() => {
		if (featuredModels.length > 0) {
			return featuredModels.map((m, i) => ({
				id: m.id || `featured-${i}`,
				agentName: m.modelName,
				prompt: m.prompt,
				walletAddress: m.walletAddress || "0x0000000000000000000000000000000000000000",
				pnl: m.lastPnl ?? 0,
				roiPct: m.lastRoiPct ?? 0,
				trades: m.totalTrades,
				winRatePct: 50 + (m.lastRoiPct ?? 0), // heuristics
				updatedAtLabel: m.lastResultAt ? new Date(m.lastResultAt).toLocaleDateString() : "Active",
				sourceLabel: "Featured",
				status: "READY",
			}));
		}

		const cards: AgentPromptCardEntity[] = [];
		const baseCapital = 1000;
		const userWalletAddress = authProfile?.address || walletAddress || "0x0000000000000000000000000000000000000000";

		cards.push({
			id: "user-agent",
			agentName: agentName || "Your Agent",
			prompt: strategy,
			walletAddress: userWalletAddress,
			pnl: portfolio.pnl,
			roiPct: (portfolio.pnl / baseCapital) * 100,
			trades: Math.max(1, Math.round(Math.abs(portfolio.baseBalance * 14) + Math.abs(portfolio.pnl) / 6)),
			winRatePct: Math.max(35, Math.min(88, 52 + portfolio.pnl / 9)),
			updatedAtLabel: runId ? "live now" : "idle",
			sourceLabel: "Your Prompt",
			status: runId ? "RUNNING" : isAuthenticated ? "READY" : "LOCKED",
		});

		leaderboard.slice(0, 3).forEach((entry, index) => {
			const knownPrompt = agentOptions.find(
				(option) => option.name.toLowerCase() === entry.agentName.toLowerCase(),
			)?.strategy;

			cards.push({
				id: `lb-${entry.playerAddress.toLowerCase()}-${index}`,
				agentName: entry.agentName,
				prompt: knownPrompt || FALLBACK_PROMPTS[index % FALLBACK_PROMPTS.length],
				walletAddress: entry.playerAddress,
				pnl: entry.pnl,
				roiPct: (entry.pnl / baseCapital) * 100,
				trades: 8 + index * 4,
				winRatePct: Math.max(35, Math.min(91, 58 + entry.pnl / 10)),
				updatedAtLabel: new Date(entry.updatedAt * 1000).toLocaleTimeString(),
				sourceLabel: "Leaderboard",
				status: "READY",
			});
		});

		while (cards.length < 4) {
			const index = cards.length;
			// Generate deterministic pseudo-random realistic looking data so cards aren't empty
			const mix = (index % 2 === 0) ? 1 : -1;
			const pnl = (index + 1) * 235 * mix + (index * 50);
			const roiPct = (pnl / baseCapital) * 100;

			cards.push({
				id: `fallback-${index}`,
				agentName: `Template ${index + 1}`,
				prompt: FALLBACK_PROMPTS[index % FALLBACK_PROMPTS.length],
				walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
				pnl: pnl,
				roiPct: roiPct,
				trades: 4 + (index * 3),
				winRatePct: 45 + (index * 5),
				updatedAtLabel: "Demo",
				sourceLabel: "Template",
				status: "LOCKED",
			});
		}

		return cards;
	}, [
		featuredModels,
		agentName,
		strategy,
		portfolio.pnl,
		portfolio.baseBalance,
		runId,
		isAuthenticated,
		authProfile,
		walletAddress,
		leaderboard,
		agentOptions,
	]);

	return (
		<section className="mx-auto max-w-full space-y-4 px-4 pb-4 pt-2 md:px-8 xl:px-10">
			<ScrollChoreographyHero
				cards={heroCards}
				isAuthenticated={isAuthenticated}
				walletAddress={authProfile?.address || walletAddress}
				walletChainLabel={walletChainLabel}
				onConnect={() => {
					void runSafeAction(connectWalletAndAuthenticate);
				}}
				onOpenForge={() => router.push("/forge")}
			/>

			{/* Anatomy of Power Section - Overlaps Hero on Scroll */}
			<div className="relative z-20 -mt-20 md:-mt-32">
				<AnatomyOfPowerSection />
			</div>

			<LeaderboardSection />
		</section>
	);
}
