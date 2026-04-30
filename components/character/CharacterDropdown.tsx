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
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 12px 6px 10px",
          background: "var(--surface2)",
          border: "1px solid var(--border2)",
          borderRadius: 4,
          cursor: "pointer",
          color: "var(--text)",
          fontFamily: "'Exo 2', sans-serif",
          minWidth: 220
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: current.faction === "horde" ? "#f87171" : "#38bdf8",
            flexShrink: 0
          }}
        />
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600, color: current.color }}>
          {current.name}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
          {current.class} · {current.realm}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "var(--surface)",
            border: "1px solid var(--border2)",
            borderRadius: 6,
            overflow: "hidden",
            zIndex: 100,
            minWidth: 260,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            animation: "fadeIn 0.15s ease"
          }}
        >
          {characters.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onSelect(c.id);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                cursor: "pointer",
                background: c.id === selectedId ? "var(--surface3)" : "transparent",
                borderBottom: "1px solid var(--border)",
                transition: "background 0.1s"
              }}
              onMouseEnter={(e) => {
                if (c.id !== selectedId) e.currentTarget.style.background = "var(--surface2)";
              }}
              onMouseLeave={(e) => {
                if (c.id !== selectedId) e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: c.faction === "horde" ? "#f87171" : "#38bdf8",
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.color,
                    fontFamily: "Rajdhani",
                    letterSpacing: "0.3px"
                  }}
                >
                  {c.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                  {c.race} {c.class} · {c.realm}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>iLvl {c.ilvl}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
