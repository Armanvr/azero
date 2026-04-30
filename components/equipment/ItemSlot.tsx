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
      style={{
        width: 32,
        height: 32,
        borderRadius: 3,
        background: `${rc}18`,
        border: `1px solid ${rc}44`,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: rc,
          fontFamily: "Rajdhani",
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.1
        }}
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 4,
        background: isActive ? "var(--surface3)" : "var(--surface2)",
        border: `1px solid ${isActive ? rc + "88" : "var(--border)"}`,
        cursor: "pointer",
        transition: "all 0.15s",
        minHeight: 44
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "var(--border2)";
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
      {side === "left" && Icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: rc,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "Rajdhani",
            letterSpacing: "0.3px"
          }}
        >
          {slot.item}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 500 }}>iLvl {slot.ilvl}</span>
          {slot.enchant && (
            <span
              style={{
                fontSize: 9,
                color: "var(--blue)",
                opacity: 0.7,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              ✦ {slot.enchant}
            </span>
          )}
        </div>
      </div>
      {side === "right" && Icon}
    </div>
  );
}
