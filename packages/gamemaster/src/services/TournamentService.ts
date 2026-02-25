import { v4 as uuidv4 } from "uuid";
import { Server } from "socket.io";
import { AgentConfig } from "../types";
import { LeaderboardService } from "./LeaderboardService";
import { MarketDataService } from "./MarketDataService";
import { TradingOrchestrator } from "./TradingOrchestrator";

interface StartTournamentInput {
  agents: [AgentConfig, AgentConfig];
  symbol: string;
  durationSec: number;
  tickSec: number;
}

export class TournamentService {
  private readonly trading: TradingOrchestrator;
  private readonly marketData: MarketDataService;
  private readonly leaderboard: LeaderboardService;
  private isRunning: boolean;

  constructor(
    trading: TradingOrchestrator,
    marketData: MarketDataService,
    leaderboard: LeaderboardService,
  ) {
    this.trading = trading;
    this.marketData = marketData;
    this.leaderboard = leaderboard;
    this.isRunning = false;
  }

  startTournament(input: StartTournamentInput, io: Server): {
    tournamentId: string;
    startAt: number;
    endAt: number;
  } {
    if (this.isRunning) {
      throw new Error("A tournament is already running");
    }

    this.isRunning = true;

    const tournamentId = uuidv4();
    const startAt = Date.now();
    const endAt = startAt + input.durationSec * 1000;

    for (const agent of input.agents) {
      this.trading.resetPortfolio(agent.playerAddress);
    }

    io.emit("tournament:started", {
      tournamentId,
      startAt,
      endAt,
      agents: input.agents,
      symbol: input.symbol,
    });

    void this.executeTournament({ tournamentId, startAt, endAt, ...input }, io)
      .catch((error) => {
        io.emit("tournament:error", {
          tournamentId,
          message: error instanceof Error ? error.message : "Unknown tournament error",
        });
      })
      .finally(() => {
        this.isRunning = false;
      });

    return { tournamentId, startAt, endAt };
  }

  private async executeTournament(
    input: StartTournamentInput & { tournamentId: string; startAt: number; endAt: number },
    io: Server,
  ): Promise<void> {
    while (Date.now() < input.endAt) {
      const market = await this.marketData.getSnapshot(input.symbol);

      await Promise.all(
        input.agents.map((agent) =>
          this.trading.runStep({
            runId: input.tournamentId,
            agent,
            symbol: input.symbol,
            source: "tournament",
            io,
            market,
          }),
        ),
      );

      await this.delay(input.tickSec * 1000);
    }

    const leaderboard = await this.leaderboard.getLeaderboard();
    const [agentA, agentB] = input.agents;

    const agentAResult = leaderboard.find(
      (row) => row.playerAddress.toLowerCase() === agentA.playerAddress.toLowerCase(),
    );

    const agentBResult = leaderboard.find(
      (row) => row.playerAddress.toLowerCase() === agentB.playerAddress.toLowerCase(),
    );

    const winner =
      (agentAResult?.pnl ?? Number.NEGATIVE_INFINITY) >=
      (agentBResult?.pnl ?? Number.NEGATIVE_INFINITY)
        ? agentA
        : agentB;

    io.emit("tournament:ended", {
      tournamentId: input.tournamentId,
      endedAt: Date.now(),
      winner,
      results: {
        [agentA.playerAddress]: agentAResult ?? null,
        [agentB.playerAddress]: agentBResult ?? null,
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
