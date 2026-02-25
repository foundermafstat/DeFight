"use client";

import { FaWallet } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/context/GameContext";
import { HeroPromptCardsDeck } from "./HeroPromptCardsDeck";
import { AgentPromptCardEntity } from "./types";

interface HeroPromptCardsSectionProps {
  cards: AgentPromptCardEntity[];
  isAuthenticated: boolean;
  walletAddress?: string;
  walletChainLabel: string;
  onConnect: () => void;
  onOpenForge: () => void;
}

export function HeroPromptCardsSection({
  cards,
  isAuthenticated,
  walletAddress,
  walletChainLabel,
  onConnect,
  onOpenForge,
}: HeroPromptCardsSectionProps) {
  const bestPnl = cards.length > 0 ? Math.max(...cards.map((card) => card.pnl)) : 0;
  const runningCount = cards.filter((card) => card.status === "RUNNING").length;

  return (
    <section className="rounded-[20px] border border-[#313640] bg-[#1d2026] p-5 shadow-[0_18px_38px_rgba(0,0,0,0.42)]">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="label">Prompt cards hero</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-[#f4f6f9] md:text-4xl">
            AI Wealth Builder: prompts, cards, and on-chain results
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#bcc2cc]">
            Each card stores the prompt entity of an AI agent and its current trading results. Rotate through
            live and leaderboard agents in one premium overview.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!isAuthenticated && (
              <Button type="button" onClick={onConnect}>
                <FaWallet className="mr-2 text-xs" />
                Connect Wallet
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={onOpenForge}>
              Open Forge
            </Button>
            {isAuthenticated && walletAddress && (
              <div className="panel-soft flex min-h-9 items-center gap-2 px-3 py-2 text-xs text-[#d5dbe3]">
                <span className="label text-[0.62rem]">Authorized</span>
                <span className="mono text-[#eef2f7]">{shortAddress(walletAddress)}</span>
                <span className="text-[#8f97a3]">•</span>
                <span className="text-[#bfc7d1]">{walletChainLabel}</span>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-[12px] border border-[#353c46] bg-[#252932] p-3">
              <p className="label text-[0.58rem]">Cards loaded</p>
              <p className="mt-2 text-sm text-[#eef2f8]">{cards.length}</p>
            </div>
            <div className="rounded-[12px] border border-[#353c46] bg-[#252932] p-3">
              <p className="label text-[0.58rem]">Running now</p>
              <p className="mt-2 text-sm text-[#eef2f8]">{runningCount}</p>
            </div>
            <div className="rounded-[12px] border border-[#353c46] bg-[#252932] p-3">
              <p className="label text-[0.58rem]">Best PnL</p>
              <p className={bestPnl >= 0 ? "mt-2 text-sm text-[#e3bb78]" : "mt-2 text-sm text-[#e6b0b0]"}>
                {bestPnl >= 0 ? "+" : ""}
                {bestPnl.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <HeroPromptCardsDeck cards={cards} />
      </div>
    </section>
  );
}

