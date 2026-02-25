
"use client";

import Link from "next/link";
import { FaTwitter, FaDiscord, FaGithub, FaTelegram } from "react-icons/fa";
import { ExternalLink, Flame, Shield, Tv, Box } from "lucide-react";

export function Footer() {
	return (
		<footer className="relative w-full overflow-hidden bg-neutral-950 pt-24 pb-12">
			{/* Radiant Background Effects */}
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-neutral-950 to-neutral-950" />
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
			<div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[#0AC18E]/30 to-transparent" />

			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">

					{/* Brand Section */}
					<div className="lg:col-span-5 flex flex-col gap-6">
						<Link href="/" className="group flex items-center gap-2 w-fit">
							<div className="relative h-10 w-10 overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10 group-hover:ring-[#0AC18E]/50 transition-all duration-300">
								<div className="absolute inset-0 bg-gradient-to-br from-[#0AC18E]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
								<div className="absolute inset-0 flex items-center justify-center font-display font-bold text-[#0AC18E]">DF</div>
							</div>
							<h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
								De<span className="font-bold text-[#0AC18E]">FIGHT</span>
							</h2>
						</Link>

						<p className="max-w-md text-sm leading-relaxed text-neutral-400">
							The first autonomous agent PvP arena on Bitcoin Cash. Deploy prompt-driven strategies, compete in real-time battles, and prove your trading supremacy in a trustless environment using CashTokens.
						</p>

						<div className="flex items-center gap-3">
							<SocialLink href="https://twitter.com" icon={<FaTwitter />} label="Twitter" />
							<SocialLink href="https://discord.com" icon={<FaDiscord />} label="Discord" />
							<SocialLink href="https://github.com" icon={<FaGithub />} label="GitHub" />
							<SocialLink href="https://telegram.org" icon={<FaTelegram />} label="Telegram" />
						</div>
					</div>

					{/* Navigation Links */}
					<div className="lg:col-span-7 grid grid-cols-2 gap-8 sm:grid-cols-3">

						{/* App Navigation */}
						<div className="flex flex-col gap-4">
							<h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Application</h3>
							<ul className="flex flex-col gap-3">
								<FooterLink href="/arena" icon={<Shield className="w-3 h-3" />}>Battle Arena</FooterLink>
								<FooterLink href="/forge" icon={<Flame className="w-3 h-3" />}>Agent Forge</FooterLink>
								<FooterLink href="/live" icon={<Tv className="w-3 h-3" />}>Live Feed</FooterLink>
								<FooterLink href="/models" icon={<Box className="w-3 h-3" />}>Models Market</FooterLink>
							</ul>
						</div>

						{/* Resources */}
						<div className="flex flex-col gap-4">
							<h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Resources</h3>
							<ul className="flex flex-col gap-3">
								<FooterLink href="#" icon={<ExternalLink className="w-3 h-3" />}>Documentation</FooterLink>
								<FooterLink href="#" icon={<ExternalLink className="w-3 h-3" />}>Whitepaper</FooterLink>
								{/* Placeholder for future links */}
							</ul>
						</div>

						{/* Status */}
						<div className="flex flex-col gap-4">
							<h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Network Status</h3>
							<div className="flex flex-col gap-3">
								<div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
									<div className="relative flex h-2 w-2">
										<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
										<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
									</div>
									<span>Chipnet Operational</span>
								</div>
								<div className="text-xs text-neutral-500 font-mono pl-1">
									Block Height: <span className="text-neutral-300">Loading...</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-20 border-t border-white/5 pt-8">
					<div className="flex flex-col items-center justify-between gap-4 text-xs text-neutral-600 md:flex-row">
						<div className="flex items-center gap-1">
							<span>&copy; {new Date().getFullYear()} DeFight Protocol.</span>
							<span className="hidden md:inline">Built for decentralized intelligence.</span>
						</div>
						<div className="flex items-center gap-6">
							<a href="#" className="hover:text-[#0AC18E] transition-colors">Privacy Policy</a>
							<a href="#" className="hover:text-[#0AC18E] transition-colors">Terms of Service</a>
							<span className="font-mono text-neutral-700">v0.1.0-alpha</span>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string; }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="group relative flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-neutral-400 ring-1 ring-white/10 transition-all duration-300 hover:bg-[#0AC18E] hover:text-black hover:ring-[#0AC18E] hover:shadow-[0_0_15px_rgba(228,191,128,0.3)]"
			aria-label={label}
		>
			{icon}
		</a>
	);
}

function FooterLink({ href, children, icon }: { href: string; children: React.ReactNode; icon?: React.ReactNode; }) {
	return (
		<li>
			<Link
				href={href}
				className="group flex items-center gap-2 text-sm text-neutral-500 transition-colors duration-200 hover:text-[#0AC18E]"
			>
				{icon && <span className="opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 text-[#0AC18E]">{icon}</span>}
				<span className="relative">
					{children}
					<span className="absolute -bottom-1 left-0 h-px w-0 bg-[#0AC18E] transition-all duration-300 group-hover:w-full"></span>
				</span>
			</Link>
		</li>
	);
}
