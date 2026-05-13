"use client";
import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/types";

interface Props {
  characters: Character[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function CharacterDropdown({ characters, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = characters.find((c) => c.id === selectedId) ?? characters[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 bg-surface2 border border-border2 rounded cursor-pointer text-text font-exo min-w-[220px]"
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: current.faction === "horde" ? "#f87171" : "#38bdf8" }}
        />
        <span className="flex-1 text-left text-sm font-semibold" style={{ color: current.color }}>
          {current.name}
        </span>
        <span className="text-xs text-text-dim">
          {current.class} · {current.realm}
        </span>
        <span className="text-xs text-text-muted ml-1">▾</span>
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+4px)] left-0 bg-surface border border-border2 rounded-[6px] overflow-hidden z-[100] min-w-[260px] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          style={{ animation: "fadeIn 0.15s ease" }}
        >
          {characters.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onSelect(c.id);
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer border-b border-border transition-colors duration-100
                ${c.id === selectedId ? "bg-surface3" : "bg-transparent hover:bg-surface2"}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: c.faction === "horde" ? "#f87171" : "#38bdf8" }}
              />
              <div className="flex-1">
                <div
                  className="text-sm font-semibold font-rajdhani tracking-wide"
                  style={{ color: c.color }}
                >
                  {c.name}
                </div>
                <div className="text-xs text-text-muted mt-px">
                  {c.race} {c.class} · {c.realm}
                </div>
              </div>
              <div className="text-xs text-text-dim font-semibold">iLvl {c.ilvl}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
