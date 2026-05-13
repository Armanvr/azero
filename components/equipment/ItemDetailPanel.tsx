"use client";
import { useEffect, useState } from "react";
import { RARITY_COLORS } from "@/lib/constants";
import type { ItemDetails, SelectedItem } from "@/lib/types";
import SourceCard from "./SourceCard";

interface Props {
  item: SelectedItem;
  onClose: () => void;
}

export default function ItemDetailPanel({ item, onClose }: Props) {
  const [data, setData] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const rc = RARITY_COLORS[item.rarity] || "#9d9d9d";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/items/${encodeURIComponent(item.name)}/sources`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json && json.sources) {
          setData({ type: json.type, slot: json.slot, stats: json.stats, sources: json.sources });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.name]);

  return (
    <div
      className="fixed top-0 right-0 bottom-0 w-[320px] bg-surface border-l border-border2 flex flex-col z-[200] shadow-[-8px_0_32px_rgba(0,0,0,0.4)]"
      style={{ animation: "slideInR 0.22s ease" }}
    >
      <div className="px-4 pt-[14px] pb-3 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px] font-bold font-rajdhani tracking-[0.5px] leading-[1.3] uppercase"
              style={{ color: rc }}
            >
              {item.name}
            </div>
            {item.slot && (
              <div className="text-[10px] text-text-muted mt-[3px]">
                {item.slot}
                {data ? ` · ${data.type}` : ""}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-none text-text-muted cursor-pointer text-[16px] leading-none px-1 py-[2px] shrink-0 rounded-[3px] transition-colors duration-150 hover:text-text"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-[6px] mt-[10px] items-center">
          <span
            className="px-2 py-[3px] rounded-[3px] text-[11px] font-bold font-rajdhani border"
            style={{ background: `${rc}18`, color: rc, borderColor: `${rc}33` }}
          >
            iLvl {item.ilvl}
          </span>
          <span className="px-2 py-[3px] rounded-[3px] text-[10px] bg-surface2 text-text-dim border border-border">
            {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
          </span>
          {item.enchant && (
            <span className="text-[10px] text-blue flex items-center gap-[3px]">
              ✦ {item.enchant}
            </span>
          )}
        </div>
      </div>

      {data && data.stats && data.stats[0] !== "–" && (
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="text-[10px] text-text-muted tracking-[1px] mb-2">STATISTIQUES</div>
          <div className="flex flex-col gap-1">
            {data.stats.map((s, i) => (
              <div key={i} className="text-[11px] text-text-dim flex items-center gap-[6px]">
                <span className="w-[3px] h-[3px] rounded-full bg-border2 shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="text-[10px] text-text-muted tracking-[1px] mb-[10px]">
          SOURCES D&apos;OBTENTION
        </div>
        {loading ? (
          <div className="text-[11px] text-text-muted text-center py-5">Chargement…</div>
        ) : data ? (
          <div className="flex flex-col gap-[10px]">
            {data.sources.map((s, i) => (
              <SourceCard key={i} source={s} index={i} />
            ))}
          </div>
        ) : (
          <div className="py-5 text-center">
            <div className="text-[22px] mb-2 opacity-30">🔍</div>
            <div className="text-[11px] text-text-muted">Aucune source disponible</div>
          </div>
        )}
      </div>

      <div className="px-4 py-[10px] border-t border-border shrink-0">
        <div className="text-[10px] text-text-muted text-center">
          Cliquez sur un autre item pour comparer
        </div>
      </div>
    </div>
  );
}
