"use client";

import { useMemo } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { SavedPromptModel, SavedPromptModelRun, shortAddress } from "@/context/GameContext";

type ModelPerformanceCardProps = {
	model: SavedPromptModel;
	runs: SavedPromptModelRun[];
	ownerAddress: string;
};

function formatPair(symbol: string): string {
	const clean = symbol.trim().toUpperCase();
	if (!clean) {
		return "BNB/USDT";
	}

	if (clean.includes("/")) {
		return clean;
	}

	const knownQuotes = ["USDT", "USDC", "BUSD", "BTC", "ETH", "BNB"];
	const quote = knownQuotes.find((candidate) => clean.endsWith(candidate) && clean.length > candidate.length);
	if (!quote) {
		return clean;
	}

	return `${clean.slice(0, -quote.length)}/${quote}`;
}

function extractAssets(model: SavedPromptModel, pair: string): string[] {
	const rawAssets = model.settings?.assets;
	if (Array.isArray(rawAssets)) {
		const filtered = rawAssets
			.filter((item): item is string => typeof item === "string")
			.map((item) => item.trim().toUpperCase())
			.filter(Boolean);

		if (filtered.length > 0) {
			return filtered;
		}
	}

	return pair.split("/").map((item) => item.trim()).filter(Boolean);
}

export function ModelPerformanceCard({ model, runs, ownerAddress }: ModelPerformanceCardProps) {
	const pair = useMemo(() => formatPair(model.symbol), [model.symbol]);
	const assets = useMemo(() => extractAssets(model, pair), [model, pair]);

	const chartData = useMemo(() => {
		if (!runs.length) {
			const pnl = model.lastPnl ?? 0;
			const roi = model.lastRoiPct ?? 0;
			return [
				{ step: "1", pnl, roi },
				{ step: "2", pnl, roi },
			];
		}

		const ascending = [...runs].reverse();
		const points = ascending.map((run, index) => ({
			step: String(index + 1),
			pnl: Number(run.pnl ?? 0),
			roi: Number(run.roiPct ?? 0),
		}));

		if (points.length === 1) {
			points.push({
				...points[0],
				step: "2",
			});
		}

		return points;
	}, [runs, model.lastPnl, model.lastRoiPct]);

	const owner = ownerAddress || "0x0000000000000000000000000000000000000000";
	const gradientId = `model-area-${model.id.replace(/[^a-zA-Z0-9]/g, "")}`;
	const lastPnl = model.lastPnl ?? 0;
	const avgRoi = model.averageRoiPct ?? 0;

	return (
		<article className="panel p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-display text-xl text-[#f2f4f6]">{model.modelName}</p>
					<p className="mt-1 text-xs text-[#8f97a3]">{model.llmModel}</p>
				</div>
				<div className="status-chip text-[#d3b074]">Runs: {model.totalRuns}</div>
			</div>

			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
				<div className="panel-soft p-3">
					<p className="label">Owner Wallet</p>
					<p className="mono mt-2 text-sm text-[#edf0f4]" title={owner}>
						{shortAddress(owner)}
					</p>
				</div>
				<div className="panel-soft p-3">
					<p className="label">Token Pair</p>
					<p className="mt-2 text-sm text-[#edf0f4]">{pair}</p>
					<p className="mt-1 text-xs text-[#8f97a3]">{assets.join(" • ")}</p>
				</div>
			</div>

			<div className="panel-soft mt-3 p-3">
				<p className="label">Trading Prompt</p>
				<p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-[#d3d9e2]">
					{model.prompt}
				</p>
			</div>

			<div className="chart-shell mt-3 h-[190px] p-2">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={chartData} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
						<defs>
							<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#d3b074" stopOpacity={0.42} />
								<stop offset="95%" stopColor="#d3b074" stopOpacity={0.03} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
						<XAxis dataKey="step" stroke="#aeb5bf" fontSize={11} tickLine={false} axisLine={false} />
						<YAxis stroke="#aeb5bf" fontSize={11} tickLine={false} axisLine={false} />
						<Tooltip
							contentStyle={{
								background: "#1f2227",
								border: "1px solid #3a3f47",
								borderRadius: "10px",
								color: "#f2f4f6",
								fontSize: "12px",
							}}
						/>
						<Area
							type="monotone"
							dataKey="pnl"
							stroke="#d3b074"
							strokeWidth={2}
							fillOpacity={1}
							fill={`url(#${gradientId})`}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-3">
				<div className="panel-soft p-3">
					<p className="label">PnL</p>
					<p className={`mt-2 text-lg ${lastPnl >= 0 ? "text-[#d3b074]" : "text-[#efb0b0]"}`}>
						{lastPnl >= 0 ? "+" : ""}
						{lastPnl.toFixed(2)}
					</p>
				</div>
				<div className="panel-soft p-3">
					<p className="label">ROI</p>
					<p className={`mt-2 text-lg ${avgRoi >= 0 ? "text-[#d3b074]" : "text-[#efb0b0]"}`}>
						{avgRoi >= 0 ? "+" : ""}
						{avgRoi.toFixed(2)}%
					</p>
				</div>
			</div>
		</article>
	);
}
