"use client";

import { useEffect, useState, useCallback } from "react";
import { JsonRpcProvider, Contract } from "ethers";

// Public BSC Testnet RPC (no wallet needed – read-only)
const BSC_TESTNET_RPC = "https://bsc-testnet.publicnode.com";
const LEADERBOARD_ADDRESS = process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS || "";
const SCORE_SCALE = Number(process.env.NEXT_PUBLIC_SCORE_SCALE || 100);

const LEADERBOARD_READ_ABI = [
	"function getLeaderboard() external view returns (address[] playerAddresses, string[] agentNames, int256[] pnls, string[] metadatas, uint256[] updatedAts)",
	"function totalScores() external view returns (uint256)",
] as const;

export type MetadataJson = {
	agentName?: string;
	owner?: string;
	pnl?: number;
	roi?: number;
	createdAt?: string;
	description?: string;
};

export type OnChainLeaderboardRow = {
	rank: number;
	playerAddress: string;
	agentName: string;
	pnl: number;
	roi: number;
	createdAt: string | null;
	description: string;
	owner: string;
	updatedAt: number;
	metadata: MetadataJson;
};

function safeParseMetadata(raw: string): MetadataJson {
	if (!raw || raw === "{}") return {};
	try {
		return JSON.parse(raw) as MetadataJson;
	} catch {
		return {};
	}
}

export function useOnChainLeaderboard(refreshIntervalMs = 30_000) {
	const [rows, setRows] = useState<OnChainLeaderboardRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(async () => {
		if (!LEADERBOARD_ADDRESS) {
			setError("Leaderboard contract address not configured.");
			setLoading(false);
			return;
		}

		try {
			const provider = new JsonRpcProvider(BSC_TESTNET_RPC);
			const contract = new Contract(LEADERBOARD_ADDRESS, LEADERBOARD_READ_ABI, provider);

			const [players, names, pnls, metadatas, updatedAts] =
				(await contract.getLeaderboard()) as [string[], string[], bigint[], string[], bigint[]];

			const parsed: OnChainLeaderboardRow[] = players.map((address, i) => {
				const meta = safeParseMetadata(metadatas[i] ?? "{}");
				const realPnl = Number(pnls[i]) / SCORE_SCALE;
				const realRoi = typeof meta.roi === "number" ? meta.roi : 0;
				const displayName = meta.agentName || names[i] || "Unknown Agent";
				const owner = meta.owner || address;

				return {
					rank: 0, // assigned after sort
					playerAddress: address,
					agentName: displayName,
					pnl: realPnl,
					roi: realRoi,
					createdAt: meta.createdAt || null,
					description: meta.description || "",
					owner,
					updatedAt: Number(updatedAts[i]),
					metadata: meta,
				};
			});

			// Sort by PnL descending, then assign rank
			const sorted = parsed
				.sort((a, b) => b.pnl - a.pnl)
				.map((row, idx) => ({ ...row, rank: idx + 1 }));

			setRows(sorted);
			setError(null);
		} catch (e) {
			console.error("[useOnChainLeaderboard] fetch error:", e);
			setError("Could not load on-chain leaderboard.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetch();
		const interval = setInterval(() => void fetch(), refreshIntervalMs);
		return () => clearInterval(interval);
	}, [fetch, refreshIntervalMs]);

	return { rows, loading, error, refetch: fetch };
}
