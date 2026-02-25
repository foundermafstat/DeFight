export interface LeaderboardRecord {
  rank: number;
  playerAddress: string;
  agentName: string;
  pnl: number;
  updatedAt: number;
}

export async function readLeaderboard(
  apiUrl: string,
): Promise<LeaderboardRecord[]> {
  const response = await fetch(`${apiUrl}/leaderboard`);
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
  }
  const data = await response.json() as any;
  return data.leaderboard || [];
}
