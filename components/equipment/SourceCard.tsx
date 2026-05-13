"use client";
import type { ItemSource } from "@/lib/types";
import DiffBadge from "./DiffBadge";

export default function SourceCard({ source, index }: { source: ItemSource; index: number }) {
  return (
    <div
      className="bg-surface2 border border-border rounded-[5px] px-3 py-[10px]"
      style={{ animation: `fadeIn 0.2s ease ${index * 0.06}s both` }}
    >
      <div className="text-xs font-bold text-text font-rajdhani tracking-[0.3px] mb-[6px]">
        {source.boss}
      </div>

      <div className="flex items-center gap-[6px] mb-2">
        <span className="text-[9px] opacity-50">📍</span>
        <span className="text-[10px] text-text-dim">{source.instance}</span>
      </div>

      <div className="flex items-center gap-[6px] flex-wrap">
        <DiffBadge diff={source.difficulty} />
        <span className="text-[10px] text-text-muted flex items-center gap-[3px]">
          <span className="opacity-50">⚔️</span> {source.ilvlRange}
        </span>
        <span className="ml-auto text-[10px] text-text-muted bg-surface3 px-[6px] py-[2px] rounded-[3px] border border-border">
          {source.dropRate}
        </span>
      </div>
    </div>
  );
}
