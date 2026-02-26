"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { FaBolt, FaChartLine, FaShieldHalved, FaWallet } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { AgentPromptCardEntity } from "./types";
import { shortAddress } from "@/context/GameContext";

type ScrollChoreographyHeroProps = {
	cards: AgentPromptCardEntity[];
	isAuthenticated: boolean;
	walletAddress?: string;
	walletChainLabel: string;
	onConnect: () => void;
	onOpenForge: () => void;
};

type MousePoint = { x: number; y: number; };

function useMousePosition(): MousePoint {
	const [mousePos, setMousePos] = useState<MousePoint>({ x: 0, y: 0 });

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			setMousePos({
				x: (event.clientX / window.innerWidth) * 2 - 1,
				y: (event.clientY / window.innerHeight) * 2 - 1,
			});
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return mousePos;
}

function useScrollProgress(): number {
	const [scrollY, setScrollY] = useState(0);

	useEffect(() => {
		const handleScroll = () => setScrollY(window.scrollY);
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return scrollY;
}

function lerp(from: number, to: number, t: number): number {
	return from + (to - from) * t;
}

function getCardStyle(index: number, scrollY: number, viewportHeight: number, mouse: MousePoint): CSSProperties {
	const progress = (scrollY / viewportHeight) * 1.2;

	const scatterX = ((index % 3) - 1) * 360 + (mouse.x * 34 * (index + 1));
	const scatterY = Math.floor(index / 3) * 200 + (mouse.y * 28 * (index + 1));
	const scatterRot = (index % 2 === 0 ? 1 : -1) * 24;

	const stackX = index * 2;
	const stackY = index * -2;
	const stackRot = index * 2;

	const col = index % 3;
	const row = Math.floor(index / 3);
	// Increased spacing between cards: 340px horizontal (was 250), 420px vertical (was 340)
	// Centered rows vertically by using 0.5 offset (was 0.4)
	const gridX = (col - 1) * 340;
	const gridY = (row - 0.5) * 420;

	let x = scatterX;
	let y = scatterY;
	let rot = scatterRot;
	let z = index * 80;
	let opacity = 1;
	let scale = 1;

	if (progress < 1) {
		x = scatterX;
		y = scatterY;
		rot = scatterRot;
		z = index * 80;
		scale = 1;
	} else if (progress < 2) {
		const t = Math.max(0, Math.min(1, progress - 1));
		x = lerp(scatterX, stackX, t);
		y = lerp(scatterY, stackY, t);
		rot = lerp(scatterRot, stackRot, t);
		z = (index * 80) * (1 - t);
		scale = 1 - (t * 0.1);
	} else {
		const t = Math.max(0, Math.min(1, progress - 2));
		x = lerp(stackX, gridX, t);
		y = lerp(stackY, gridY, t);
		rot = lerp(stackRot, 0, t);
		z = 0;
		scale = 0.9 + (t * 0.1);
	}

	return {
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: "-190px",
		marginLeft: "0px",
		transform: `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${rot}deg) scale(${scale})`,
		opacity,
	};
}

import { PremiumCard } from "./PremiumCard";

function buildCardsForScene(cards: AgentPromptCardEntity[]): AgentPromptCardEntity[] {
	if (!cards.length) {
		return [];
	}

	const source = cards.slice(0, 6);
	if (source.length >= 6) {
		return source;
	}

	const filled: AgentPromptCardEntity[] = [...source];
	let index = 0;
	while (filled.length < 6) {
		const clone = source[index % source.length];
		filled.push({
			...clone,
			id: `${clone.id}-clone-${filled.length}`,
			sourceLabel: "Scene",
		});
		index += 1;
	}

	return filled;
}

export function ScrollChoreographyHero({
	cards,
	isAuthenticated,
	walletAddress,
	walletChainLabel,
	onConnect,
	onOpenForge,
}: ScrollChoreographyHeroProps) {
	const scrollY = useScrollProgress();
	const mouse = useMousePosition();
	const [viewportHeight, setViewportHeight] = useState(1000);

	useEffect(() => {
		const applyHeight = () => setViewportHeight(window.innerHeight || 1000);
		applyHeight();
		window.addEventListener("resize", applyHeight);
		return () => window.removeEventListener("resize", applyHeight);
	}, []);

	const totalHeight = viewportHeight * 3.4;
	const sceneCards = useMemo(() => buildCardsForScene(cards), [cards]);

	return (
		<section className="relative">
			<div style={{ height: `${totalHeight}px` }} className="relative z-10 mb-4">
				<div
					className="perspective-container fixed left-0 right-0 top-[58px] h-[calc(100vh-58px)] items-center justify-center overflow-hidden md:top-[62px] md:h-[calc(100vh-62px)]"
					style={{
						pointerEvents: scrollY > totalHeight ? "none" : "auto",
						opacity: scrollY > totalHeight ? 0 : 1,
						transition: "opacity 0.5s",
					}}
				>


					<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-35" />

					<div
						className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-center transition-opacity duration-500"
						style={{ opacity: scrollY < viewportHeight * 0.5 ? 1 : 0 }}
					>
						<img
							src="/defight-svg.svg"
							alt="Unlimited"
							className="h-32 md:h-64 xl:h-[64rem] w-auto fill-[#0AC18E] opacity-30"
						/>
					</div>

					<div className="relative h-full w-full max-w-6xl" style={{ perspective: "1200px" }}>
						{sceneCards.map((card, index) => (
							<div
								key={card.id}
								style={getCardStyle(index, scrollY, viewportHeight, mouse)}
								className="will-change-transform transition-transform ease-out"
							>
								<PremiumCard card={card} onActivate={onOpenForge} />
							</div>
						))}
					</div>



					{/* <div className="absolute left-4 right-4 top-4 z-20 mx-auto max-w-[1200px] md:left-8 md:right-8">
						<div className="panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="label">Scroll choreography hero</p>
								<p className="font-display mt-1 text-2xl text-[#f2f4f6] md:text-3xl">
									AI Wealth Builder: prompt cards in motion
								</p>
								<p className="mt-1 text-xs text-[#bcc2cc]">
									Scroll to orchestrate cards. Hover cards for tilt and live glare response.
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{!isAuthenticated && (
									<Button type="button" onClick={onConnect}>
										<FaWallet className="mr-2 text-xs" />
										Connect Wallet
									</Button>
								)}
								<Button type="button" variant="secondary" onClick={onOpenForge}>
									Open Forge
								</Button>
								{isAuthenticated && walletAddress && (
									<div className="panel-soft flex min-h-9 items-center gap-2 px-3 py-2 text-xs text-[#d5dbe3]">
										<span className="label text-[0.62rem]">Authorized</span>
										<span className="mono text-[#eef2f7]">{shortAddress(walletAddress)}</span>
										<span className="text-[#8f97a3]">•</span>
										<span className="text-[#bfc7d1]">{walletChainLabel}</span>
									</div>
								)}
							</div>
						</div>
					</div> */}
				</div>
			</div>
		</section>
	);
}
