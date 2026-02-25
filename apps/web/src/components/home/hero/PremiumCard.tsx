"use client";

import React, { useMemo, useRef, useState } from "react";
import { FaBolt, FaChartLine, FaShieldHalved, FaWallet } from "react-icons/fa6";
import { shortAddress } from "@/context/GameContext";
import { AgentPromptCardEntity } from "./types";

export type PremiumCardProps = {
	card: AgentPromptCardEntity;
	onActivate: () => void;
};

const SPARK_SEED = "spark-seed";

function generateChartPath(seed: string, sentiment: "positive" | "negative" | "neutral"): string {
	let hash = 0;
	const str = seed + SPARK_SEED;
	for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
	const random = () => {
		hash = (hash * 16807) % 2147483647;
		return (hash - 1) / 2147483646;
	};

	let y = 50;
	const steps = 20;
	const points: [number, number][] = [];

	for (let i = 0; i <= steps; i++) {
		const x = (i / steps) * 100;
		// Positive trend means y decreases (0 is top)
		// Negative trend means y increases
		let trend = 0;
		if (sentiment === "positive") trend = -2.5;
		if (sentiment === "negative") trend = 2.5;

		const noise = (random() - 0.5) * 10;
		y += trend + noise;
		y = Math.max(5, Math.min(95, y));
		points.push([x, y]);
	}

	const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
	return `${d} L 100,100 L 0,100 Z`;
}

export function PremiumCard({ card, onActivate }: PremiumCardProps) {
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

		// Increased opacity range for better visibility
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

	const isNeutral = Math.abs(card.pnl) < 0.001 && Math.abs(card.roiPct) < 0.001;
	const isNegative = !isNeutral && (card.pnl < 0 || card.roiPct < 0);
	const sentiment = isNeutral ? "neutral" : isNegative ? "negative" : "positive";

	const accentColor = isNeutral ? "#e4bf80" : (isNegative ? "#fca5a5" : "#86efac");
	const chartPath = useMemo(() => generateChartPath(card.id, sentiment), [card.id, sentiment]);

	const chartFill = accentColor;

	return (
		<div
			ref={cardRef}
			className="relative h-[380px] w-[248px] cursor-pointer select-none"
			style={{
				transformStyle: "preserve-3d",
				transition: "transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1)",
				transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
			}}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			onClick={onActivate}
		>
			<div
				className="absolute inset-0 overflow-hidden rounded-[20px] shadow-[0_24px_46px_rgba(0,0,0,0.5)] bg-[#121418]"
			>
				{/* 1. Chart Background */}
				<div className="absolute inset-x-[-20%] bottom-0 h-[70%] opacity-30 mix-blend-screen pointer-events-none">
					<svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
						<defs>
							<linearGradient id={`grad-${card.id}`} x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stopColor={chartFill} stopOpacity="0.8" />
								<stop offset="100%" stopColor={chartFill} stopOpacity="0.0" />
							</linearGradient>
						</defs>
						<path d={chartPath} fill={`url(#grad-${card.id})`} stroke={chartFill} strokeWidth="0.5" />
					</svg>
				</div>

				{/* 2. Dark Gradient Overlay */}
				<div
					className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/40 to-transparent opacity-80 pointer-events-none"
				/>

				{/* 3. Glare/Noise */}
				<div
					className="pointer-events-none absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage:
							"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.66' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
					}}
				/>
				<div
					className="pointer-events-none absolute inset-0 transition-opacity duration-300"
					style={{
						// Removed mix-blend-overlay and switched to normal alpha blending for better visibility of glare
						// Increased opacity of the white center
						background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 80%)`,
						mixBlendMode: "overlay", // Try overlay again but with higher opacity input
						opacity: glare.opacity,
					}}
				/>
				{/* Extra shine layer for "pop" */}
				<div
					className="pointer-events-none absolute inset-0 transition-opacity duration-300 mix-blend-plus-lighter"
					style={{
						background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%)`,
						opacity: glare.opacity,
					}}
				/>

				{/* 4. Glass Content Layer */}
				<div className="relative z-10 flex h-full flex-col p-5">
					<div className="flex items-start justify-between">
						<div>
							<p className="font-display text-[0.65rem] uppercase tracking-widest text-[#8f97a3]">{card.sourceLabel}</p>
							<p className="font-display mt-0.5 text-[1.4rem] leading-none text-[#e4bf80] drop-shadow-md">{card.agentName}</p>
						</div>
						<div
							className="rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider backdrop-blur-md"
							style={{ color: accentColor }}
						>
							{card.status}
						</div>
					</div>

					<div className="mt-4 flex-1">
						<div className="relative overflow-hidden rounded-xl bg-white/5 p-3 backdrop-blur-md shadow-inner transition-colors">
							<p className="font-display text-[0.6rem] uppercase tracking-wider text-[#8f97a3]">Strategy Core</p>
							<p className="mt-1.5 text-[0.5rem] text-[#d1d5db]/90 line-clamp-4 font-display tracking-wide">
								{card.prompt}
							</p>
						</div>
					</div>

					<div className="mt-auto grid grid-cols-2 gap-2">
						<div className="rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-md">
							<p className="font-display text-[0.55rem] uppercase tracking-wider text-[#8f97a3]">Total PnL</p>
							<p className="mt-0.5 text-base font-display tracking-tight" style={{ color: accentColor }}>
								{card.pnl >= 0 ? "+" : ""}
								{card.pnl.toFixed(2)}
							</p>
						</div>
						<div className="rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-md">
							<p className="font-display text-[0.55rem] uppercase tracking-wider text-[#8f97a3]">ROI</p>
							<p className="mt-0.5 text-base font-display tracking-tight" style={{ color: accentColor }}>
								{card.roiPct >= 0 ? "+" : ""}
								{card.roiPct.toFixed(2)}%
							</p>
						</div>
					</div>

					<div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
						<div className="flex items-center gap-1.5">
							<div className="h-4 w-4 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
								<FaWallet className="h-2 w-2 text-[#8f97a3]" />
							</div>
							<p className="font-mono text-[0.65rem] text-[#8f97a3]">{shortAddress(card.walletAddress)}</p>
						</div>
						<FaChartLine className="h-3 w-3 opacity-50" style={{ color: accentColor }} />
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
	);
}
