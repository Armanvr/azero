"use client";
import type { ItemSource } from "@/lib/types";
import DiffBadge from "./DiffBadge";

export default function SourceCard({ source, index }: { source: ItemSource; index: number }) {
  return (
    <div
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 5,
        padding: "10px 12px",
        animation: `fadeIn 0.2s ease ${index * 0.06}s both`
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text)",
          fontFamily: "Rajdhani",
          letterSpacing: "0.3px",
          marginBottom: 6
        }}
      >
        {source.boss}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 9, opacity: 0.5 }}>📍</span>
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{source.instance}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <DiffBadge diff={source.difficulty} />
        <span
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 3
          }}
        >
          <span style={{ opacity: 0.5 }}>⚔️</span> {source.ilvlRange}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--text-muted)",
            background: "var(--surface3)",
            padding: "2px 6px",
            borderRadius: 3,
            border: "1px solid var(--border)"
          }}
        >
          {source.dropRate}
        </span>
      </div>
    </div>
  );
}
