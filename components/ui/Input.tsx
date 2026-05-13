"use client";
import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, className = "", ...rest }, ref) {
  return (
    <div>
      {label && (
        <label className="text-xs text-text-dim tracking-wider mb-1 block">
          {label}
        </label>
      )}
      <input
        ref={ref}
        {...rest}
        className={`w-full px-3 py-2.5 bg-surface2 border border-border2 rounded text-text text-base font-exo outline-none transition-colors duration-150 focus:border-gold ${className}`}
      />
    </div>
  );
});

export default Input;
