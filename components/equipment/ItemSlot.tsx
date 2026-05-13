"use client";
import { RARITY_COLORS } from "@/lib/constants";
import type { EquippedItem, SelectedItem } from "@/lib/types";

interface Props {
  slot: EquippedItem;
  side: "left" | "right";
  isActive: boolean;
  onSelect: (item: SelectedItem) => void;
}

export default function ItemSlot({ slot, side, isActive, onSelect }: Props) {
  const rc = RARITY_COLORS[slot.rarity] || "#9d9d9d";

  const Icon = (
    <div
      className="w-8 h-8 rounded-[3px] shrink-0 flex items-center justify-center"
      style={{ background: `${rc}18`, border: `1px solid ${rc}44` }}
    >
      <span
        className="text-[9px] font-rajdhani font-bold text-center leading-[1.1]"
        style={{ color: rc }}
      >
        {slot.label.slice(0, 3).toUpperCase()}
      </span>
    </div>
  );

  return (
    <div
      onClick={() =>
        onSelect({
          name: slot.item,
          ilvl: slot.ilvl,
          rarity: slot.rarity,
          enchant: slot.enchant,
          slot: slot.label
        })
      }
      className={`flex items-center gap-2 px-2 py-[6px] rounded cursor-pointer transition-all duration-150 min-h-[44px] border
        ${isActive ? "bg-surface3" : "bg-surface2 hover:bg-surface3"}`}
      style={{ borderColor: isActive ? `${rc}88` : "var(--border)" }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--border2)"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      {side === "left" && Icon}
      <div className="flex-1 min-w-0">
        <div
          className="text-[11px] font-semibold font-rajdhani tracking-[0.3px] whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ color: rc }}
        >
          {slot.item}
        </div>
        <div className="flex items-center gap-[6px] mt-0.5">
          <span className="text-[10px] text-text-dim font-medium">iLvl {slot.ilvl}</span>
          {slot.enchant && (
            <span className="text-[9px] text-blue opacity-70 whitespace-nowrap overflow-hidden text-ellipsis">
              ✦ {slot.enchant}
            </span>
          )}
        </div>
      </div>
      {side === "right" && Icon}
    </div>
  );
}
