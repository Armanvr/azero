"use client";
import { RARITY_COLORS } from "@/lib/constants";
import type { ItemRarity } from "@/lib/types";

export default function RarityDot({ rarity }: { rarity: ItemRarity }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: RARITY_COLORS[rarity] || "#9d9d9d" }}
    />
  );
}
