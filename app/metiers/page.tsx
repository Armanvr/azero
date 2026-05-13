"use client";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

export default function MetiersPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <Header active="metiers" />

      <div
        className="flex-1 flex items-center justify-center flex-col gap-5"
        style={{ animation: "fadeIn 0.3s ease" }}
      >
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-surface2 border-2 border-border2 flex items-center justify-center text-[32px]">
            ⚒️
          </div>
          <div
            className="absolute -inset-2 rounded-full border border-dashed border-border2"
            style={{ animation: "spin 12s linear infinite" }}
          />
        </div>

        <div className="text-[32px] font-rajdhani font-bold tracking-[3px]">MÉTIERS</div>
        <div className="text-[13px] text-text-muted tracking-[1px]">COMING SOON</div>
        <div className="w-[200px] h-px bg-[linear-gradient(90deg,transparent,var(--border2),transparent)]" />
        <p className="text-xs text-text-muted max-w-[320px] text-center leading-[1.7]">
          La section Métiers est en cours de développement. Elle affichera la progression par personnage.
        </p>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-2 px-5 py-[9px] bg-transparent border border-border2 rounded text-text-dim text-[11px] font-semibold tracking-[0.5px] cursor-pointer font-exo transition-all duration-150 hover:border-gold hover:text-gold-light"
        >
          ← RETOUR À L&apos;ACCUEIL
        </button>
      </div>
    </div>
  );
}
