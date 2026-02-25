"use client";

import { useEffect, useRef, useState } from "react";
import { FaBolt, FaChartLine, FaShieldHalved } from "react-icons/fa6";
import { shortAddress } from "@/context/GameContext";
import { cn } from "@/lib/utils";
import { AgentPromptCardEntity } from "./types";

interface PromptResultCardProps {
  card: AgentPromptCardEntity;
  isActive: boolean;
  onActivate: () => void;
}

function statusTone(status: AgentPromptCardEntity["status"]): string {
  if (status === "RUNNING") return "bg-[#1f3628] text-[#7be5a0]";
  if (status === "READY") return "bg-[#2b2f38] text-[#cfd6e0]";
  return "bg-[#362525] text-[#e7b3b3]";
}

export function PromptResultCard({ card, isActive, onActivate }: PromptResultCardProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setTilt({ x: 0, y: 0 });
      setFlipped(false);
    }
  }, [isActive]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || !shellRef.current || flipped) {
      return;
    }

    const rect = shellRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setTilt({
      x: ((y - centerY) / centerY) * -8,
      y: ((x - centerX) / centerX) * 10,
    });
  };

  const resetTilt = () => {
    if (!isActive) {
      return;
    }
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={shellRef}
      className="relative h-[412px] w-[290px] select-none"
      style={{
        perspective: "1200px",
      }}
      onClick={onActivate}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
    >
      <div
        className="relative h-full w-full rounded-[18px] border border-[#333944] bg-[#1f232a] shadow-[0_22px_44px_rgba(0,0,0,0.5)] transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + (flipped ? 180 : 0)}deg)`,
        }}
      >
        <div className="absolute inset-0 rounded-[18px] p-5 [backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="label text-[0.62rem]">{card.sourceLabel}</p>
              <h3 className="font-display text-[1.5rem] leading-none text-[#f5f7fb]">
                {card.agentName}
              </h3>
            </div>
            <span
              className={cn(
                "rounded-[10px] px-2 py-1 text-[0.62rem] font-medium tracking-[0.11em]",
                statusTone(card.status),
              )}
            >
              {card.status}
            </span>
          </div>

          <div className="mt-5 rounded-[12px] border border-[#343b46] bg-[#252a33] p-3">
            <p className="label text-[0.6rem]">Prompt</p>
            <p className="mt-2 text-[0.78rem] leading-6 text-[#c4ccd8] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] overflow-hidden">
              {card.prompt}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[12px] border border-[#353c47] bg-[#252931] p-3">
              <p className="label text-[0.58rem]">PnL</p>
              <p
                className={cn(
                  "mt-2 text-sm font-semibold",
                  card.pnl >= 0 ? "text-[#e4bc79]" : "text-[#e9b1b1]",
                )}
              >
                {card.pnl >= 0 ? "+" : ""}
                {card.pnl.toFixed(2)}
              </p>
            </div>
            <div className="rounded-[12px] border border-[#353c47] bg-[#252931] p-3">
              <p className="label text-[0.58rem]">ROI</p>
              <p
                className={cn(
                  "mt-2 text-sm font-semibold",
                  card.roiPct >= 0 ? "text-[#e4bc79]" : "text-[#e9b1b1]",
                )}
              >
                {card.roiPct >= 0 ? "+" : ""}
                {card.roiPct.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-[12px] border border-[#353c47] bg-[#252931] px-3 py-2">
            <p className="label text-[0.58rem]">Wallet</p>
            <p className="mono mt-1 text-xs text-[#e7ebf2]">{shortAddress(card.walletAddress)}</p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-[#97a1b0]">
              <span className="mr-2">Updated:</span>
              <span className="mono">{card.updatedAtLabel}</span>
            </div>
            <button
              type="button"
              className="rounded-[10px] border border-[#3a404c] bg-[#2b3039] px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.13em] text-[#ebf0f8]"
              onClick={(event) => {
                event.stopPropagation();
                setFlipped(true);
              }}
            >
              Results
            </button>
          </div>
        </div>

        <div className="absolute inset-0 rounded-[18px] p-5 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <div className="h-full rounded-[14px] border border-[#343b45] bg-[#1a1f26] p-4">
            <div className="flex items-center justify-between">
              <p className="label">Execution Snapshot</p>
              <FaShieldHalved className="text-[#d6b37a]" />
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-[10px] border border-[#313844] bg-[#232832] px-3 py-2">
                <span className="text-[#9ca6b5]">Trades</span>
                <span className="mono text-[#ecf0f6]">{card.trades}</span>
              </div>
              <div className="flex items-center justify-between rounded-[10px] border border-[#313844] bg-[#232832] px-3 py-2">
                <span className="text-[#9ca6b5]">Win Rate</span>
                <span className="mono text-[#ecf0f6]">{card.winRatePct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between rounded-[10px] border border-[#313844] bg-[#232832] px-3 py-2">
                <span className="text-[#9ca6b5]">Mode</span>
                <span className="mono text-[#ecf0f6]">{card.status}</span>
              </div>
            </div>

            <div className="mt-4 rounded-[12px] border border-[#313844] bg-[#232832] p-3">
              <p className="label text-[0.58rem]">Prompt fingerprint</p>
              <p className="mono mt-2 text-xs text-[#c9d1dd]">
                {`${card.agentName.toLowerCase().replace(/\s+/g, "-")}:${Math.abs(
                  Math.round(card.pnl * 100 + card.trades),
                )}`}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-[10px] border border-[#3a404b] bg-[#2b3039] px-2.5 py-1 text-[0.62rem] text-[#ced5df]">
                <FaBolt className="text-[#d7b779]" />
                Prompt
              </span>
              <span className="inline-flex items-center gap-1 rounded-[10px] border border-[#3a404b] bg-[#2b3039] px-2.5 py-1 text-[0.62rem] text-[#ced5df]">
                <FaChartLine className="text-[#d7b779]" />
                Result
              </span>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-[10px] border border-[#3a404c] bg-[#2b3039] py-2 text-[0.65rem] uppercase tracking-[0.14em] text-[#ecf0f7]"
              onClick={(event) => {
                event.stopPropagation();
                setFlipped(false);
              }}
            >
              Back to Prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

