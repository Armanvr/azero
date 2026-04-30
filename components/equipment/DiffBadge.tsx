"use client";
import { DIFF_COLORS } from "@/lib/constants";
import type { Difficulty } from "@/lib/types";

export default function DiffBadge({ diff }: { diff: Difficulty }) {
  const c = DIFF_COLORS[diff] || DIFF_COLORS.Normal;
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.5px",
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
        fontFamily: "'Exo 2', sans-serif"
      }}
    >
      {diff}
    </span>
  );
}
