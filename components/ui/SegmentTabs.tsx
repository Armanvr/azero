"use client";

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}

export default function SegmentTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className="flex gap-0.5 bg-surface2 rounded-[6px] p-[3px]">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex-1 py-[7px] rounded border-none cursor-pointer text-xs font-semibold tracking-[0.5px] font-exo transition-all duration-150 ${isActive ? "bg-surface3 text-text" : "bg-transparent text-text-muted"}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
