"use client";

import React, { useState } from 'react';
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard';

// Mock data for the MVP marketplace
const MOCK_BOTS = [
    {
        id: "a1b2c3d4e5f60000000000000000000000000000000000000000000000000000",
        name: "AlphaSniper v2",
        generation: 1,
        winRate: 68.5,
        pnl: 142.3,
        priceBch: 0.15,
        imageCid: "none"
    },
    {
        id: "f9e8d7c6b5a40000000000000000000000000000000000000000000000000000",
        name: "Quantum Arbitrage",
        generation: 2,
        winRate: 54.2,
        pnl: 45.8,
        priceBch: 0.08,
        imageCid: "none"
    },
    {
        id: "1234567890abcdef000000000000000000000000000000000000000000000000",
        name: "Volatility Rider",
        generation: 1,
        winRate: 72.1,
        pnl: 315.0,
        priceBch: 0.45,
        imageCid: "none"
    },
    {
        id: "fedcba0987654321000000000000000000000000000000000000000000000000",
        name: "Bear Market Defender",
        generation: 3,
        winRate: 60.0,
        pnl: 88.4,
        priceBch: 0.12,
        imageCid: "none"
    }
];

export default function MarketplacePage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);

    const handleBuy = async (botId: string, price: number) => {
        setIsProcessing(true);
        setPurchaseStatus(`Initiating trustless buy for ${price} BCH...`);

        // Simulate smart contract interaction via a wallet provider
        setTimeout(() => {
            setPurchaseStatus('Awaiting Paytaca signature...');

            setTimeout(() => {
                setPurchaseStatus('Transaction confirmed! You are the new owner. The IPFS prompt is now bound to your address.');
                setIsProcessing(false);
            }, 2500);
        }, 1500);
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {MOCK_BOTS.map(bot => (
                        <MarketplaceCard key={bot.id} bot={bot} onBuy={handleBuy} />
                    ))}
                </div>

            </div>
        </main>
    );
}
