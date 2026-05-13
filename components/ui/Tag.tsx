import type { ReactNode } from "react";

type Variant = "gold" | "purple" | "blue" | "green" | "red" | "default";
type Size = "sm" | "md";

interface Props {
  variant?: Variant;
  size?: Size;
  dot?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, { base: string; dot: string }> = {
  gold:    { base: "bg-gold-dim text-gold-light border-[rgba(201,150,12,0.3)]",   dot: "bg-gold" },
  purple:  { base: "bg-purple-dim text-purple border-[rgba(168,85,247,0.3)]",     dot: "bg-purple" },
  blue:    { base: "bg-[rgba(56,189,248,0.1)] text-blue border-[rgba(56,189,248,0.25)]",   dot: "bg-blue" },
  green:   { base: "bg-[rgba(74,222,128,0.1)] text-green border-[rgba(74,222,128,0.25)]",  dot: "bg-green" },
  red:     { base: "bg-[rgba(248,113,113,0.1)] text-red border-[rgba(248,113,113,0.25)]",  dot: "bg-red" },
  default: { base: "bg-surface2 text-text-dim border-border",                     dot: "bg-text-muted" },
};

const sizeClasses: Record<Size, { tag: string; dot: string }> = {
  sm: { tag: "px-[7px] py-[2px] text-[10px] gap-1", dot: "w-[5px] h-[5px]" },
  md: { tag: "px-[10px] py-1 text-xs gap-[5px]",    dot: "w-[6px] h-[6px]" },
};

export default function Tag({ variant = "default", size = "md", dot = false, children }: Props) {
  const v = variantClasses[variant];
  const s = sizeClasses[size];

  return (
    <span
      className={`inline-flex items-center border rounded font-semibold font-exo tracking-[0.4px] leading-none whitespace-nowrap ${v.base} ${s.tag}`}
    >
      {dot && (
        <span className={`inline-block rounded-full shrink-0 ${v.dot} ${s.dot}`} />
      )}
      {children}
    </span>
  );
}
