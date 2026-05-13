"use client";

export default function StatChip({ icon, value, color }: { icon: string; value: string; color: string }) {
  return (
    <span className="text-[11px] flex items-center gap-1 font-semibold" style={{ color }}>
      <span className="opacity-70">{icon}</span> {value}
    </span>
  );
}
