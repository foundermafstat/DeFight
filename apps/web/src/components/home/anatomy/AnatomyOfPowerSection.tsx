"use client";

import React from "react";
import { PremiumCard } from "@/components/home/hero/PremiumCard";
import { AgentPromptCardEntity } from "@/components/home/hero/types";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";

// Static dummy card for display
const DEMO_CARD: AgentPromptCardEntity = {
	id: "anatomy-demo",
	agentName: "OBSIDIAN",
	prompt: "An advanced market-neutral strategy leveraging high-frequency arbitrage opportunities while maintaining strict risk controls.",
	walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
	pnl: 1085.00,
	roiPct: 8.5,
	trades: 42,
	winRatePct: 68,
	updatedAtLabel: "Live",
	sourceLabel: "Infinite",
	status: "READY",
};

const HOW_IT_WORKS_STEPS = [
	{
		title: "Connect Wallet",
		description: "Link your wallet to access the AI Battles platform and manage your assets securely.",
		step: "01",
	},
	{
		title: "Choose Agent",
		description: "Select from a variety of pre-trained AI agents or create your own custom strategy.",
		step: "02",
	},
	{
		title: "Configure",
		description: "Fine-tune your agent's parameters using natural language prompts and risk controls.",
		step: "03",
	},
	{
		title: "Battle & Earn",
		description: "Deploy your agent into the arena to compete against others and earn rewards.",
		step: "04",
	},
];



export function AnatomyOfPowerSection() {
	return (
		<section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-950 py-24 pb-60 z-20">
			{/* Background Gradient */}
			<div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-gradient-to-b from-black via-transparent to-neutral-950 z-0" />

			{/* Grid Background Pattern */}
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 z-0" />



			{/* How It Works Section */}
			<div className="relative z-10 w-full max-w-6xl px-4 md:px-6 mb-32">
				<div className="mb-12 text-center">
					<h2 className="text-2xl font-light uppercase tracking-[0.3em] text-white">
						How it <span className="font-bold text-[#e4bf80]">Works</span>
					</h2>
				</div>

				<div className="px-12">
					<Carousel
						opts={{
							align: "start",
							loop: true,
						}}
						className="w-full"
					>
						<CarouselContent className="-ml-4">
							{HOW_IT_WORKS_STEPS.map((step, index) => (
								<CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
									<div className="group relative h-full overflow-hidden rounded-xl bg-gradient-to-br from-neutral-800/20 to-neutral-900/40 p-8 backdrop-blur-sm transition-all duration-500 hover:bg-neutral-800/40 hover:shadow-[0_0_50px_-10px_rgba(255,255,255,0.05)]">
										{/* Subtle top accent line that appears on hover - now silver/white */}
										<div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

										<div className="mb-4 text-4xl font-display text-neutral-700 transition-all duration-500 group-hover:scale-110 group-hover:text-neutral-500 origin-left">
											{step.step}
										</div>
										<h3 className="mb-2 font-display text-lg font-bold uppercase tracking-wide text-white transition-colors duration-300 group-hover:text-[#e4bf80]">
											{step.title}
										</h3>
										<p className="text-sm leading-relaxed text-neutral-400 transition-colors duration-300 group-hover:text-neutral-300">
											{step.description}
										</p>
									</div>
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="hidden md:flex bg-neutral-900/50 border-white/10 text-white hover:bg-neutral-800 hover:text-white" />
						<CarouselNext className="hidden md:flex bg-neutral-900/50 border-white/10 text-white hover:bg-neutral-800 hover:text-white" />
					</Carousel>
				</div>
			</div>

			<div className="relative z-10 mb-20 text-center">
				<h2 className="text-3xl font-light uppercase tracking-[0.3em] text-white">
					your custom <span className="font-bold text-[#e4bf80]">defai agent</span>
				</h2>
			</div>

			<div className="relative flex items-center justify-center z-10">
				{/* The Central Card - Scaled Up */}
				<div className="relative md:scale-125 z-10">
					<PremiumCard card={DEMO_CARD} onActivate={() => { }} />
				</div>

				{/* Animated Background Glow */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e4bf80]/15 rounded-full blur-[100px] animate-pulse pointer-events-none z-0 mix-blend-screen" />


				{/* Top Right Annotation: Strategy Core */}
				<div
					className="group absolute left-full ml-3 flex w-72 items-center text-left"
					style={{ top: "-14%" }}
				>
					{/* Connector Line */}
					<div className="flex items-center">
						<div className="h-1 w-1 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
						<div className="relative h-px w-8 overflow-hidden bg-neutral-700 md:w-16">
							<div className="absolute inset-0 w-full translate-x-full bg-white transition-transform duration-1000 group-hover:translate-x-0" />
						</div>
					</div>

					{/* Glass Content */}
					<div className="rounded-xl bg-black/40 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-black/60">
						<h4 className="font-display text-xs font-bold uppercase tracking-wide text-white">model status</h4>
						<p className="font-display mt-1 text-[10px] uppercase leading-relaxed tracking-widest text-neutral-400">
							Test, tournament Agent. <br />
							or private NFT.
						</p>
					</div>
				</div>

				{/* Bottom Right Annotation: Wallet Security */}
				<div
					className="group absolute left-full ml-3 flex w-72 items-center text-left "
					style={{ bottom: "5%" }}
				>
					{/* Connector Line */}
					<div className="flex items-center">
						<div className="h-1 w-1 rounded-full bg-[#e4bf80] shadow-[0_0_10px_rgba(228,191,128,0.8)]" />
						<div className="relative h-px w-8 overflow-hidden bg-neutral-700 md:w-16">
							<div className="absolute inset-0 w-full translate-x-full bg-[#e4bf80] transition-transform duration-1000 group-hover:translate-x-0" />
						</div>
					</div>

					{/* Glass Content */}
					<div className="rounded-xl bg-black/40 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-black/60">
						<h4 className="font-display text-xs font-bold uppercase tracking-wide text-[#e4bf80]">Total roi</h4>
						<p className="font-display mt-1 text-[10px] uppercase leading-relaxed tracking-widest text-neutral-400">
							PVP power. <br />
							Instant ROI tracker
						</p>
					</div>
				</div>

				{/* Top Left Annotation: MODEL NAME */}
				<div
					className="group absolute right-full mr-3 flex w-72 items-center justify-end text-right "
					style={{ top: "-10%" }}
				>
					{/* Glass Content */}
					<div className="rounded-xl bg-black/40 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-black/60">
						<h4 className="font-display text-xs font-bold uppercase tracking-wide text-white">MODEL NAME</h4>
						<p className="font-display mt-1 text-[10px] uppercase leading-relaxed tracking-widest text-neutral-400">
							Unique identity. <br />
							Custom branding.
						</p>
					</div>

					{/* Connector Line */}
					<div className="flex items-center">
						<div className="relative h-px w-8 overflow-hidden bg-neutral-700 md:w-16">
							<div className="absolute inset-0 w-full -translate-x-full bg-white transition-transform duration-1000 group-hover:translate-x-0" />
						</div>
						<div className="h-1 w-1 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
					</div>
				</div>

				{/* Top Left Annotation: MODEL PROMPT */}
				<div
					className="group absolute right-full mr-3 flex w-72 items-center justify-end text-right"
					style={{ top: "20%" }}
				>
					{/* Glass Content */}
					<div className="rounded-xl bg-black/40 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-black/60">
						<h4 className="font-display text-xs font-bold uppercase tracking-wide text-white">MODEL PROMPT</h4>
						<p className="font-display mt-1 text-[10px] uppercase leading-relaxed tracking-widest text-neutral-400">
							Natural language instruction. <br />
							Adaptive behavior.
						</p>
					</div>

					{/* Connector Line */}
					<div className="flex items-center">
						<div className="relative h-px w-8 overflow-hidden bg-neutral-700 md:w-16">
							<div className="absolute inset-0 w-full -translate-x-full bg-white transition-transform duration-1000 group-hover:translate-x-0" />
						</div>
						<div className="h-1 w-1 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
					</div>
				</div>

				{/* Bottom Left Annotation: Performance */}
				<div
					className="group absolute right-full mr-3 flex w-72 items-center justify-end text-right"
					style={{ bottom: "5%" }}
				>
					{/* Glass Content */}
					<div className="rounded-xl bg-black/40 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-black/60">
						<h4 className="font-display text-xs font-bold uppercase tracking-wide text-[#e4bf80]">Total ROI</h4>
						<p className="font-display mt-1 text-[10px] uppercase leading-relaxed tracking-widest text-neutral-400">
							Verifiable on-chain history. <br />
							Instant PnL tracking.
						</p>
					</div>

					{/* Connector Line */}
					<div className="flex items-center">
						<div className="relative h-px w-8 overflow-hidden bg-neutral-700 md:w-16">
							<div className="absolute inset-0 w-full -translate-x-full bg-[#e4bf80] transition-transform duration-1000 group-hover:translate-x-0" />
						</div>
						<div className="h-1 w-1 rounded-full bg-[#e4bf80] shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
					</div>
				</div>

				{/* Visual Connector Lines to Card Elements using absolute positioning on the wrapper */}
				{/* These are purely decorative lines that fade out as they reach the card to simulate connecting to specific parts */}
			</div>
		</section>
	);
}
