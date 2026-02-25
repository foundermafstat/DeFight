"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentTestPage() {
	const [strategy, setStrategy] = useState("You are a momentum trader. Buy when price is up > 0.5%, Sell when down < -0.5%. Otherwise Hold.");
	const [symbol, setSymbol] = useState("BNBUSDT");
	const [price, setPrice] = useState("600");
	const [priceChange, setPriceChange] = useState("1.2");
	const [quoteBal, setQuoteBal] = useState("1000");
	const [baseBal, setBaseBal] = useState("0");

	const [result, setResult] = useState<any>(null);
	const [loading, setLoading] = useState(false);

	const handleExecute = async () => {
		setLoading(true);
		setResult(null);
		try {
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/agent/debug-decision`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					strategy,
					market: {
						symbol,
						price: Number(price),
						priceChangePercent: Number(priceChange),
						volume: 10000,
						quoteVolume: 6000000,
						timestamp: Date.now(),
					},
					portfolio: {
						quoteBalance: Number(quoteBal),
						baseBalance: Number(baseBal),
						initialCapital: 1000,
						lastPnl: 0,
					},
				}),
			});
			const data = await res.json();
			setResult(data);
		} catch (e) {
			console.error(e);
			setResult({ error: "Failed to fetch response" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-8 max-w-6xl mx-auto space-y-6 text-[#f2f4f6]">
			<h1 className="text-3xl font-bold font-display text-[#d3b074]">Agent Mechanics Test</h1>
			<p className="text-[#8f97a3]">Simulate agent decisions without running a full session.</p>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Inputs */}
				<div className="space-y-6">
					<Card className="bg-[#1a1d21] border-[#3a3f47]">
						<CardHeader>
							<CardTitle className="text-[#f2f4f6]">Market Conditions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-xs text-[#8f97a3]">Symbol</label>
									<Input
										value={symbol} onChange={(e) => setSymbol(e.target.value)}
										className="bg-[#262a30] border-[#3a3f47] text-[#f2f4f6]"
									/>
								</div>
								<div>
									<label className="text-xs text-[#8f97a3]">Price ($)</label>
									<Input
										type="number" value={price} onChange={(e) => setPrice(e.target.value)}
										className="bg-[#262a30] border-[#3a3f47] text-[#f2f4f6]"
									/>
								</div>
								<div>
									<label className="text-xs text-[#8f97a3]">24h Change (%)</label>
									<Input
										type="number" value={priceChange} onChange={(e) => setPriceChange(e.target.value)}
										className="bg-[#262a30] border-[#3a3f47] text-[#f2f4f6]"
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-[#1a1d21] border-[#3a3f47]">
						<CardHeader>
							<CardTitle className="text-[#f2f4f6]">Portfolio State</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-xs text-[#8f97a3]">Quote Balance (USDT)</label>
									<Input
										type="number" value={quoteBal} onChange={(e) => setQuoteBal(e.target.value)}
										className="bg-[#262a30] border-[#3a3f47] text-[#f2f4f6]"
									/>
								</div>
								<div>
									<label className="text-xs text-[#8f97a3]">Base Balance (Asset)</label>
									<Input
										type="number" value={baseBal} onChange={(e) => setBaseBal(e.target.value)}
										className="bg-[#262a30] border-[#3a3f47] text-[#f2f4f6]"
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-[#1a1d21] border-[#3a3f47]">
						<CardHeader>
							<CardTitle className="text-[#f2f4f6]">Strategy Prompt</CardTitle>
						</CardHeader>
						<CardContent>
							<Textarea
								value={strategy} onChange={(e) => setStrategy(e.target.value)}
								className="bg-[#262a30] border-[#3a3f47] text-[#f2f4f6] h-32"
							/>
							<Button
								onClick={handleExecute}
								disabled={loading}
								className="w-full mt-4 bg-[#d3b074] hover:bg-[#bda06d] text-black font-semibold"
							>
								{loading ? "Analyzing..." : "Analyze & Execute"}
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Results */}
				<div className="space-y-6">
					<Card className="bg-[#1a1d21] border-[#3a3f47] h-full">
						<CardHeader>
							<CardTitle className="text-[#f2f4f6]">Execution Result</CardTitle>
						</CardHeader>
						<CardContent>
							{result ? (
								<div className="space-y-6">
									<div>
										<h4 className="text-sm font-semibold text-[#8f97a3] mb-2">Decision</h4>
										<pre className="p-4 rounded bg-[#0d1117] overflow-auto text-xs font-mono text-green-400">
											{JSON.stringify(result.decision, null, 2)}
										</pre>
									</div>

									<div>
										<h4 className="text-sm font-semibold text-[#8f97a3] mb-2">Exchange Call</h4>
										<pre className="p-4 rounded bg-[#0d1117] overflow-auto text-xs font-mono text-blue-400">
											{JSON.stringify(result.exchangeCall, null, 2)}
										</pre>
									</div>

									<div>
										<h4 className="text-sm font-semibold text-[#8f97a3] mb-2">Simulated Outcome</h4>
										<pre className="p-4 rounded bg-[#0d1117] overflow-auto text-xs font-mono text-yellow-400">
											{JSON.stringify(result.executionResult, null, 2)}
										</pre>
									</div>
								</div>
							) : (
								<div className="flex items-center justify-center h-64 text-[#3a3f47]">
									Awaiting Analysis...
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
