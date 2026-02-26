export type PromptCardStatus = "RUNNING" | "READY" | "LOCKED" | "LISTED";

export interface AgentPromptCardEntity {
	id: string;
	agentName: string;
	prompt: string;
	walletAddress: string;
	pnl: number;
	roiPct: number;
	trades: number;
	winRatePct: number;
	updatedAtLabel: string;
	sourceLabel: string;
	status: PromptCardStatus;
}

