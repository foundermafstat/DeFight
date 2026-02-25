"use client";

import { useEffect, useState, useCallback } from "react";
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

export function useOnChainLeaderboard(refreshIntervalMs = 30_000) {
	const [rows, setRows] = useState<OnChainLeaderboardRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(async () => {
		try {
			// Backend integration for CashTokens leaderboard pending
			setRows([]);
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
