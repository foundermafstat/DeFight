import React, { useState } from 'react';
import Image from 'next/image';

interface BotNFT {
    id: string;
    name: string;
    generation: number;
    winRate: number;
    pnl: number;
    priceBch: number;
    imageCid: string;
}

interface MarketplaceCardProps {
    bot: BotNFT;
    onBuy: (botId: string, price: number) => void;
}

export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ bot, onBuy }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`
        relative overflow-hidden rounded-2xl p-[1px] transition-all duration-500
        ${isHovered ? 'scale-105 shadow-2xl shadow-[#0AC18E]/20' : 'scale-100 shadow-lg'}
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Gradient Border Background */}
            <div className={`
        absolute inset-0 bg-gradient-to-br from-[#0AC18E]/80 via-emerald-600/50 to-[#0AC18E]/30 opacity-50
        transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-50'}
      `} />

            {/* Inner Card */}
            <div className="relative h-full w-full rounded-2xl bg-[#0f111a] p-5 flex flex-col z-10 backdrop-blur-xl">

                {/* Holographic header effect */}
                <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-white/5 to-transparent rounded-t-2xl pointer-events-none" />

                {/* Image / Avatar Container */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4 border border-white/10 bg-black/50 group">
                    {/* Fallback pattern if no IPFS image yet */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900 via-black to-black"></div>

                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(10,193,142,0.5)]">🤖</span>
                    </div>

                    {/* Overlay on Image */}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-display uppercase tracking-wider text-[#0AC18E]">
                        Gen {bot.generation}
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-display uppercase tracking-wider text-emerald-400">
                        Win {bot.winRate}%
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-display uppercase tracking-wide font-bold text-white mb-1 truncate">{bot.name}</h3>
                        <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                            <span>Token ID: <span className="text-xs text-gray-500 truncate inline-block w-20 align-bottom">{bot.id.slice(0, 8)}...</span></span>
                            <span className={`font-medium ${bot.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {bot.pnl >= 0 ? '+' : ''}{bot.pnl}% PnL
                            </span>
                        </div>
                    </div>

                    {/* Price & Action */}
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Price</p>
                            <p className="text-lg font-mono font-bold text-white">{bot.priceBch} <span className="text-[#0AC18E] text-sm">BCH</span></p>
                        </div>

                        <button
                            onClick={() => onBuy(bot.id, bot.priceBch)}
                            className="relative overflow-hidden group/btn bg-[#0AC18E] hover:bg-[#08a579] text-black font-bold uppercase tracking-wider text-xs px-5 py-2.5 rounded-lg transition-all"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                            Buy Bot
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
