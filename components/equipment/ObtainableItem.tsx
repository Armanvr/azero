"use client";
import { RARITY_COLORS } from "@/lib/constants";
import type { ObtainableItemData, SelectedItem } from "@/lib/types";
import RarityDot from "./RarityDot";

interface Props {
  item: ObtainableItemData;
  index: number;
  isActive: boolean;
  onSelect: (item: SelectedItem) => void;
}

export default function ObtainableItem({ item, index, isActive, onSelect }: Props) {
  const rc = RARITY_COLORS[item.rarity] || "#9d9d9d";
  return (
    <div
      onClick={() =>
        onSelect({ name: item.name, ilvl: item.ilvl, rarity: item.rarity, isSet: item.isSet })
      }
      className={`flex items-center gap-[10px] px-[10px] py-2 rounded cursor-pointer transition-all duration-150 border
        ${isActive ? "bg-surface3" : "bg-surface2 hover:bg-surface3"}`}
      style={{
        borderColor: isActive ? `${rc}88` : "var(--border)",
        animation: `fadeIn 0.2s ease ${index * 0.04}s both`
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = `${rc}66`;
          e.currentTarget.style.background = "var(--surface3)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "var(--surface2)";
        }
      }}
    >
      <div
        className="w-9 h-9 rounded-[3px] shrink-0 flex items-center justify-center"
        style={{ background: `${rc}18`, border: `1px solid ${rc}44` }}
      >
        <span className="text-[10px] font-rajdhani font-bold" style={{ color: rc }}>
          {item.ilvl}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[11px] font-bold font-rajdhani tracking-[0.4px] whitespace-nowrap overflow-hidden text-ellipsis uppercase"
          style={{ color: rc }}
        >
          {item.name}
        </div>
        <div className="flex items-center gap-2 mt-[3px]">
          <RarityDot rarity={item.rarity} />
          {item.isSet && (
            <span className="text-[9px] text-gold font-semibold tracking-[0.5px]">SET</span>
          )}
          <span className="text-[9px] text-text-muted flex items-center gap-[3px]">
            <span className="opacity-60">👥</span> {item.count}
          </span>
        </div>
      </div>
    </div>
  );
}
