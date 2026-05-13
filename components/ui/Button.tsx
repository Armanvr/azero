"use client";
import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export default function Button({ loading, children, disabled, className = "", ...rest }: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={`mt-1 px-4 py-3 rounded text-sm font-bold tracking-wide font-rajdhani transition-all duration-150 border-none
        ${isDisabled
          ? "bg-surface3 text-text-dim cursor-not-allowed"
          : "bg-gold text-[#0c0c10] cursor-pointer"
        } ${className}`}
    >
      {loading ? "Chargement..." : children}
    </button>
  );
}
