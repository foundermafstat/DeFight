"use client";

import React, { useState, useEffect } from 'react';
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard';
import { useGame, SavedPromptModel } from '@/context/GameContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function MarketplacePage() {
	const { buyMarketplaceModel, authProfile } = useGame();
	const [isProcessing, setIsProcessing] = useState(false);
	const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
	const [bots, setBots] = useState<SavedPromptModel[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchMarketplace = async () => {
			try {
				const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
				const response = await fetch(`${API_URL}/marketplace`, {
					headers: {
						'Accept': 'application/json'
					}
				});
				const data = await response.json();
				if (data.models) {
					setBots(data.models);
				}
			} catch (error) {
				console.error("Failed to fetch marketplace:", error);
			} finally {
				setIsLoading(false);
			}
		};
		fetchMarketplace();
	}, []);

	const handleBuy = async (botId: string, price: number) => {
		setIsProcessing(true);
		setPurchaseStatus(`Initiating trustless buy for ${price} BCH...`);

		try {
			await buyMarketplaceModel(botId, price);
			setPurchaseStatus('Transaction confirmed! You are the new owner. The AI model is now bound to your address.');

			// Remove the bought bot from the local state list immediately for UX
			setBots(prev => prev.filter(b => b.id !== botId));

			setTimeout(() => {
				setPurchaseStatus(null);
			}, 3000);
		} catch (error: any) {
			setPurchaseStatus(`Error: ${error.message}`);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<main className="relative min-h-screen w-full flex flex-col pt-[64px] overflow-hidden">
			{/* Ambient Background Effects */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-neutral-950 to-neutral-950" />
			<div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[#0AC18E]/20 to-transparent" />

			<div className="container mx-auto px-4 relative z-10">

				{/* Header Section */}
				<div className="mb-12 text-center max-w-3xl mx-auto pt-8">
					<h1 className="font-display text-4xl md:text-5xl font-extrabold mb-4 uppercase tracking-wide text-white">
						The Bot <span className="text-[#0AC18E]">Nexus</span>
					</h1>
					<p className="text-gray-400 text-lg">
						Acquire proven AI trading models. All NFTs are Soulbound to the Smart Contract Ecosystem and traded entirely on-chain via CashScript invariants.
					</p>
				</div>

				{/* Global Alert Notification */}
				{purchaseStatus && (
					<div className="mb-8 max-w-2xl mx-auto backdrop-blur-lg bg-[#ffffff0a] border border-indigo-500/30 rounded-xl p-4 flex items-center justify-center space-x-3 shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-in fade-in zoom-in duration-300">
						{isProcessing ? (
							<div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
						) : (
							<svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
						)}
						<span className="text-indigo-100 font-medium text-center">{purchaseStatus}</span>
					</div>
				)}

				{/* Filters / Utility bar (Mock UI) */}
				<div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-[#121418] border border-white/5 rounded-2xl p-4">
					<div className="flex space-x-2 mb-4 md:mb-0">
						<button className="px-4 py-2 rounded-lg bg-[#0AC18E]/10 text-[#0AC18E] border border-[#0AC18E]/30 font-display text-xs uppercase tracking-wider">All Generations</button>
						<button className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm border border-transparent">Gen 1 Only</button>
						<button className="px-4 py-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors font-display text-xs uppercase tracking-wider border border-transparent">Lowest Price</button>
					</div>
					<div className="relative">
						<input
							type="text"
							placeholder="Search by Bot Name or ID..."
							className="bg-neutral-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#0AC18E] w-full md:w-64 transition-colors placeholder:text-neutral-600 font-mono"
						/>
						<svg className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
					</div>
				</div>

				{/* Marketplace Grid */}
				{isLoading ? (
					<div className="flex justify-center items-center py-20">
						<div className="w-8 h-8 border-2 border-[#0AC18E] border-t-transparent rounded-full animate-spin" />
					</div>
				) : bots.length === 0 ? (
					<div className="text-center py-20">
						<h3 className="text-xl text-white font-display mb-2">Marketplace is Empty</h3>
						<p className="text-neutral-500">No AI Models are currently listed for sale.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 lg:gap-12 pb-32 pt-8 justify-items-center">
						{bots.map(bot => {
							// Map the SavedPromptModel to the BotNFT properties expected by MarketplaceCard
							const mappedBotInfo = {
								id: bot.id,
								name: bot.modelName,
								prompt: bot.prompt,
								walletAddress: bot.walletAddress,
								generation: bot.totalRuns && bot.totalRuns > 0 ? Math.ceil(bot.totalRuns / 5) : 1, // Estimate generation by experience
								winRate: (bot.lastRoiPct || 0) > 0 ? 50 + (bot.lastRoiPct || 0) : 45, // Demo representation
								pnl: bot.lastPnl || 0,
								roiPct: bot.lastRoiPct || 0,
								priceBch: bot.settings?.listPriceBch ? Number(bot.settings.listPriceBch) : 0.1,
								imageCid: bot.settings?.ipfsImageUrl as string || "none"
							};

							return <MarketplaceCard key={bot.id} bot={mappedBotInfo} onBuy={() => handleBuy(bot.id, mappedBotInfo.priceBch)} />;
						})}
					</div>
				)}

			</div>
		</main>
	);
}
