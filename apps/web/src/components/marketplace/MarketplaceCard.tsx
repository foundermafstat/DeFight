import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { FaChartLine, FaWallet } from "react-icons/fa6";
import { shortAddress } from '@/context/GameContext';

export interface BotNFT {
	id: string;
	name: string;
	prompt?: string;
	walletAddress?: string;
	generation: number;
	winRate: number;
	pnl: number;
	roiPct?: number;
	priceBch: number;
	imageCid: string;
}

interface MarketplaceCardProps {
	bot: BotNFT;
	onBuy: (botId: string, price: number) => void;
}

export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ bot, onBuy }) => {
	const cardRef = useRef<HTMLDivElement | null>(null);
	const [rotate, setRotate] = useState({ x: 0, y: 0 });
	const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

	const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
		if (!cardRef.current) {
			return;
		}

		const rect = cardRef.current.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		const rotateX = ((y - centerY) / centerY) * -25;
		const rotateY = ((x - centerX) / centerX) * 25;

		setRotate({ x: rotateX, y: rotateY });

		setGlare({
			x: (x / rect.width) * 100,
			y: (y / rect.height) * 100,
			opacity: 1,
		});
	};

	const handleMouseLeave = () => {
		setRotate({ x: 0, y: 0 });
		setGlare((prev) => ({ ...prev, opacity: 0 }));
	};

	const isNeutral = Math.abs(bot.pnl) < 0.001 && Math.abs(bot.roiPct || 0) < 0.001;
	const isNegative = !isNeutral && ((bot.pnl < 0) || ((bot.roiPct || 0) < 0));
	const sentiment = isNeutral ? "neutral" : isNegative ? "negative" : "positive";

	const accentColor = isNeutral ? "#0AC18E" : (isNegative ? "#fca5a5" : "#86efac");

	const hasImage = bot.imageCid && bot.imageCid !== "none";

	return (
		<div className="flex flex-col items-center">
			<div
				ref={cardRef}
				className="relative h-[380px] w-[248px] cursor-pointer select-none group"
				style={{
					transformStyle: "preserve-3d",
					transition: "transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1)",
					transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
				}}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
			>
				<div
					className="absolute inset-0 overflow-hidden rounded-[20px] shadow-[0_24px_46px_rgba(0,0,0,0.5)] bg-[#121418] border border-white/5"
				>
					{/* 1. Image Background instead of SVG chart */}
					<div className="absolute inset-0 z-0">
						{hasImage ? (
							<Image
								src={bot.imageCid}
								alt={bot.name}
								fill
								className="object-cover opacity-50 mix-blend-screen scale-105"
								unoptimized
							/>
						) : (
							<div className="w-full h-full bg-gradient-to-t from-emerald-900/40 to-black/40" />
						)}
					</div>

					{/* 2. Dark Gradient Overlay */}
					<div
						className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/60 to-[#0d0f12]/10 opacity-90 pointer-events-none z-0"
					/>

					{/* 3. Glare/Noise */}
					<div
						className="pointer-events-none absolute inset-0 opacity-[0.03] z-0"
						style={{
							backgroundImage:
								"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.66' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
						}}
					/>
					<div
						className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-10"
						style={{
							background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 80%)`,
							mixBlendMode: "overlay",
							opacity: glare.opacity,
						}}
					/>
					{/* Extra shine layer for "pop" */}
					<div
						className="pointer-events-none absolute inset-0 transition-opacity duration-300 mix-blend-plus-lighter z-10"
						style={{
							background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%)`,
							opacity: glare.opacity,
						}}
					/>

					{/* 4. Glass Content Layer */}
					<div className="relative z-20 flex h-full flex-col p-5">
						<div className="flex items-start justify-between">
							<div>
								<p className="font-display text-[0.65rem] uppercase tracking-widest text-[#8f97a3]">Gen {bot.generation}</p>
								<p className="font-display mt-0.5 text-[1.4rem] leading-none text-[#0AC18E] drop-shadow-md truncate w-32">{bot.name}</p>
							</div>
							<div
								className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider backdrop-blur-md"
								style={{ color: accentColor }}
							>
								Win {bot.winRate}%
							</div>
						</div>

						<div className="mt-4 flex-1">
							<div className="relative overflow-hidden rounded-xl bg-white/5 p-3 backdrop-blur-md shadow-inner transition-colors">
								<p className="font-display text-[0.6rem] uppercase tracking-wider text-[#8f97a3]">Strategy Core</p>
								<p className="mt-1.5 text-[0.5rem] text-[#d1d5db]/90 line-clamp-4 font-display tracking-wide break-words">
									{bot.prompt || "Autonomous tactical agent with predictive trend analysis and dynamic risk scoring."}
								</p>
							</div>
						</div>

						<div className="mt-auto grid grid-cols-2 gap-2">
							<div className="rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-md">
								<p className="font-display text-[0.55rem] uppercase tracking-wider text-[#8f97a3]">Total PnL</p>
								<p className="mt-0.5 text-base font-display tracking-tight" style={{ color: accentColor }}>
									{bot.pnl >= 0 ? "+" : ""}
									{bot.pnl.toFixed(2)}
								</p>
							</div>
							<div className="rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-md">
								<p className="font-display text-[0.55rem] uppercase tracking-wider text-[#8f97a3]">Price</p>
								<p className="mt-0.5 text-base font-display tracking-tight text-white flex gap-1 items-baseline">
									{bot.priceBch} <span className="text-[0.6rem] text-[#0AC18E]">BCH</span>
								</p>
							</div>
						</div>

						<div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
							<div className="flex items-center gap-1.5 overflow-hidden">
								<div className="h-4 w-4 shrink-0 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
									<FaWallet className="h-2 w-2 text-[#8f97a3]" />
								</div>
								<p className="font-mono text-[0.65rem] text-[#8f97a3] truncate">{bot.walletAddress ? shortAddress(bot.walletAddress) : "Unknown"}</p>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-[#8f97a3] text-[0.5rem] opacity-50 px-1 border border-white/10 rounded">{bot.id.slice(0, 8)}</span>
								<FaChartLine className="h-3 w-3 opacity-50" style={{ color: accentColor }} />
							</div>
						</div>
					</div>
				</div>

				{/* Drop shadow */}
				<div
					className="absolute inset-0 -z-10 rounded-[20px] bg-black/80 blur-2xl"
					style={{
						transform: "translateY(30px) scale(0.9)",
						opacity: 0.6,
					}}
				/>
			</div>

			<button
				onClick={(e) => {
					e.stopPropagation();
					onBuy(bot.id, bot.priceBch);
				}}
				className="mt-6 relative overflow-hidden group/btn bg-[#0AC18E] hover:bg-[#08a579] text-black font-bold uppercase tracking-widest text-xs px-8 py-3 rounded-full transition-all w-[200px] shadow-[0_0_20px_rgba(10,193,142,0.3)] hover:shadow-[0_0_30px_rgba(10,193,142,0.5)] transform hover:-translate-y-1"
			>
				<div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
				Buy Bot
			</button>
		</div>
	);
};
