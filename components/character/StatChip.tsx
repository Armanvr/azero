"use client";

export default function StatChip({ icon, value, color }: { icon: string; value: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        color,
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontWeight: 600
      }}
    >
      <span style={{ opacity: 0.7 }}>{icon}</span> {value}
    </span>
  );
}
