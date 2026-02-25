"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PromptResultCard } from "./PromptResultCard";
import { AgentPromptCardEntity } from "./types";

interface HeroPromptCardsDeckProps {
  cards: AgentPromptCardEntity[];
}

const ROTATION_MS = 4800;

export function HeroPromptCardsDeck({ cards }: HeroPromptCardsDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (cards.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, ROTATION_MS);

    return () => clearInterval(timer);
  }, [cards.length]);

  useEffect(() => {
    if (activeIndex > cards.length - 1) {
      setActiveIndex(0);
    }
  }, [cards.length, activeIndex]);

  const layers = useMemo(
    () =>
      cards.map((card, index) => ({
        card,
        originalIndex: index,
        layer: (index - activeIndex + cards.length) % cards.length,
      })),
    [cards, activeIndex],
  );

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[20px] border border-[#333943] bg-[#1f232a] p-4">
      <div className="relative h-[430px] overflow-hidden">
        {layers
          .sort((a, b) => b.layer - a.layer)
          .map(({ card, originalIndex, layer }) => {
            const capped = Math.min(layer, 3);
            const isActive = layer === 0;
            const translateX = capped * 32;
            const translateY = capped * 20;
            const scale = 1 - capped * 0.055;
            const opacity = layer > 3 ? 0 : 1;

            return (
              <div
                key={card.id}
                className="absolute left-0 top-0 transition-all duration-500 ease-out"
                style={{
                  transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                  zIndex: cards.length - layer,
                  opacity,
                  filter: isActive ? "none" : "saturate(0.82)",
                }}
              >
                <PromptResultCard
                  card={card}
                  isActive={isActive}
                  onActivate={() => setActiveIndex(originalIndex)}
                />
              </div>
            );
          })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-[#9ba5b3]">
          Interactive prompt cards. Hover for depth, open <span className="text-[#e3bb78]">Results</span> to flip.
        </p>
        <div className="flex items-center gap-1">
          {cards.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Go to card ${index + 1}`}
              className={cn(
                "h-2.5 w-7 rounded-full border border-[#373d47] transition-all",
                index === activeIndex ? "bg-[#d3b074]" : "bg-[#2a2f37]",
              )}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

