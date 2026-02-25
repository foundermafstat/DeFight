"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FaWallet } from "react-icons/fa6";
import { useGame } from "@/context/GameContext";
import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/utils";
import { runSafeAction } from "@/lib/safe-action";

export function Header() {
	const { isAuthenticated, authProfile, loginWithPaytaca } = useGame();
	const pathname = usePathname();
	const [hasScrolled, setHasScrolled] = useState(false);

	const navItems = [
		{ label: "Welcome", href: "/" },
		{ label: "Forge New Agent", href: "/forge" },
		{ label: "Model Studio", href: "/models" },
		{ label: "Live Trading Session", href: "/live" },
		{ label: "AI Arena", href: "/arena" },
	];

	const isActive = (href: string) => {
		if (href === "/" && pathname === "/") return true;
		if (href !== "/" && pathname?.startsWith(href)) return true;
		return false;
	};

	useEffect(() => {
		const handleScroll = () => {
			setHasScrolled(window.scrollY > 0);
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={cn(
				"fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
				hasScrolled
					? "border-b border-white/10 bg-[#0d0f12]/85 backdrop-blur-xl py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
					: "border-b border-transparent bg-transparent py-4",
			)}
		>
			<div className="mx-auto flex max-w-[1700px] items-center justify-between px-4 md:px-8">
				<Link href="/" className="group flex flex-col gap-0 shrink-0">
					<span className="font-display text-xl font-extrabold tracking-wide text-white transition-all duration-300 md:text-2xl">
						DE<span className="text-[#0AC18E] font-bold">FIGHT</span>
					</span>
					<span className="font-mono hidden text-[10px] uppercase text-[#8f97a3]/60 md:block">
						TRADING ARENA
					</span>
				</Link>

				{/* Desktop Navigation */}
				<nav
					aria-label="Primary navigation"
					className="hidden flex-1 items-center justify-center gap-1 lg:flex"
				>
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"relative px-4 py-2 font-display text-[13px] font-medium uppercase tracking-[0.15em] transition-all duration-300",
								isActive(item.href)
									? "text-[#0AC18E]"
									: "text-[#b8bfca] hover:text-white",
							)}
						>
							{item.label}
							{isActive(item.href) && (
								<span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#0AC18E] shadow-[0_0_12px_rgba(228,191,128,0.6)]" />
							)}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-3 md:gap-4">
					{!isAuthenticated && (
						<Button
							type="button"
							className="group relative h-9 md:h-10 overflow-hidden rounded-xl border border-white/10 bg-[#1c2128] px-4 md:px-6 font-display text-[10px] md:text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:border-[#0AC18E]/50 hover:bg-[#242a33] hover:shadow-[0_0_20px_rgba(228,191,128,0.15)]"
							onClick={() => {
								void runSafeAction(loginWithPaytaca);
							}}
						>
							<div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />
							<FaWallet className="mr-2 h-3 w-3 md:h-3.5 md:w-3.5 text-[#0AC18E]" />
							<span className="hidden sm:inline">Connect Wallet</span>
							<span className="sm:hidden">Connect</span>
						</Button>
					)}

					{isAuthenticated && authProfile && <UserMenu />}
				</div>
			</div>

			{/* Mobile Navigation - Scrollable Row */}
			<div className="mt-2 border-t border-white/5 bg-black/10 py-2 lg:hidden">
				<nav className="flex items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"whitespace-nowrap rounded-lg px-3 py-1.5 font-display text-[10px] font-medium uppercase tracking-[0.12em] transition-all duration-300",
								isActive(item.href)
									? "bg-[#0AC18E]/10 text-[#0AC18E]"
									: "text-[#8f97a3] hover:text-white hover:bg-white/5",
							)}
						>
							{item.label}
						</Link>
					))}
				</nav>
			</div>
		</header >
	);
}
