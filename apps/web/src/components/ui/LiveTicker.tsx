"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { Activity } from "lucide-react";

/**
 * We simulate fetching price data for these tokens.
 * In production this would come from a websocket or robust API context.
 */
const TICKER_TOKENS = ["PEPEUSDT", "WIFUSDT", "DOGEUSDT", "SHIBUSDT", "BCHUSDT", "BTCUSDT", "ETHUSDT"];

type SparklinePoint = { time: number; price: number };

type TokenTickerData = {
    symbol: string;
    currentPrice: number;
    history: SparklinePoint[];
    isUp: boolean;
};

export function LiveTicker() {
    const [tickers, setTickers] = useState<TokenTickerData[]>([]);

    useEffect(() => {
        // Basic polling mechanism for ticker data
        let interval: NodeJS.Timeout;

        const fetchPrices = async () => {
            try {
                const fetchPromises = TICKER_TOKENS.map(async (symbol) => {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/market/price/${symbol}`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    return { symbol, price: data.price };
                });

                const results = await Promise.all(fetchPromises);

                setTickers((prev) => {
                    const newTickers = [...prev];

                    results.forEach((res) => {
                        if (!res) return;

                        const existingIdx = newTickers.findIndex((t) => t.symbol === res.symbol);
                        if (existingIdx >= 0) {
                            const prevData = newTickers[existingIdx];
                            // Keep last 15 data points for the sparkline
                            const newHistory = [...prevData.history, { time: Date.now(), price: res.price }].slice(-15);
                            const isUp = res.price >= prevData.history[0].price; // Compare to oldest point in window

                            newTickers[existingIdx] = {
                                ...prevData,
                                currentPrice: res.price,
                                history: newHistory,
                                isUp,
                            };
                        } else {
                            // Initialize
                            newTickers.push({
                                symbol: res.symbol,
                                currentPrice: res.price,
                                history: [{ time: Date.now(), price: res.price }],
                                isUp: true,
                            });
                        }
                    });

                    return newTickers;
                });
            } catch (err) {
                console.warn("Failed to fetch ticker prices");
            }
        };

        fetchPrices();
        interval = setInterval(fetchPrices, 4000); // Polling every 4 seconds for a fast vibe

        return () => clearInterval(interval);
    }, []);

    if (tickers.length === 0) {
        return (
            <div className="w-full h-14 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md flex items-center justify-center px-4 shrink-0">
                <Activity className="h-4 w-4 text-neutral-600 animate-pulse mr-2" />
                <span className="text-[10px] uppercase tracking-wider text-neutral-600 font-mono">Sensors Offline...</span>
            </div>
        );
    }

    return (
        <div className="w-full h-14 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-center min-w-max h-full px-4 gap-8 mx-auto">
                {tickers.map((ticker) => (
                    <div key={ticker.symbol} className="flex flex-col min-w-[120px]">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-bold text-neutral-400 font-display tracking-wider">
                                {ticker.symbol.replace("USDT", "")}
                            </span>
                            <span className={`text-[10px] font-mono font-bold ${ticker.isUp ? "text-emerald-400" : "text-rose-400"}`}>
                                ${ticker.currentPrice < 0.01 ? ticker.currentPrice.toFixed(6) : ticker.currentPrice.toFixed(2)}
                            </span>
                        </div>

                        <div className="h-6 w-full">
                            {ticker.history.length > 2 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={ticker.history}>
                                        <defs>
                                            <linearGradient id={`grad-${ticker.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={ticker.isUp ? "#10b981" : "#f43f5e"} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={ticker.isUp ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Area
                                            type="monotone"
                                            dataKey="price"
                                            stroke={ticker.isUp ? "#10b981" : "#f43f5e"}
                                            strokeWidth={1.5}
                                            fillOpacity={1}
                                            fill={`url(#grad-${ticker.symbol})`}
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center">
                                    <div className="h-px w-full bg-neutral-800 border-dashed" />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
