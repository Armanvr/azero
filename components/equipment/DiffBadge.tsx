"use client";
import { DIFF_COLORS } from "@/lib/constants";
import type { Difficulty } from "@/lib/types";

export default function DiffBadge({ diff }: { diff: Difficulty }) {
  const c = DIFF_COLORS[diff] || DIFF_COLORS.Normal;
  return (
    <span
      className="px-[7px] py-[2px] rounded-[3px] text-[9px] font-bold tracking-[0.5px] whitespace-nowrap font-exo border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {diff}
    </span>
  );
}
