"use client";

import { GameProvider } from "@/context/GameContext";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/toaster";

export function ClientLayout({ children }: { children: React.ReactNode; }) {
	return (
		<GameProvider>
			<div className="min-h-screen bg-neutral-950">
				{/* Main Content Layer - High Z-Index to cover footer */}
				<div className="relative z-10 bg-neutral-950 shadow-2xl shadow-black ring-1 ring-white/5 mb-[500px] md:mb-[400px]">
					<Header />
					<main className="min-h-screen pt-[58px] md:pt-[62px]">
						{children}
					</main>
					<Toaster />
				</div>

				{/* Fixed Footer Layer - Low Z-Index */}
				<div className="fixed bottom-0 left-0 w-full z-0 h-[500px] md:h-[400px]">
					<Footer />
				</div>
			</div>
		</GameProvider>
	);
}
