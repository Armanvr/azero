import type { Difficulty, ItemRarity, WowClass } from "./types";

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#9d9d9d",
  uncommon: "#1eff00",
  rare: "#0070dd",
  epic: "#a335ee",
  legendary: "#ff8000",
  purple: "#a335ee"
};

export const DIFF_COLORS: Record<Difficulty, { bg: string; text: string; border: string }> = {
  LFR:        { bg: "rgba(74,222,128,0.12)",  text: "#4ade80", border: "rgba(74,222,128,0.25)" },
  Normal:     { bg: "rgba(56,189,248,0.12)",  text: "#38bdf8", border: "rgba(56,189,248,0.25)" },
  "Heroïque": { bg: "rgba(168,85,247,0.12)",  text: "#a855f7", border: "rgba(168,85,247,0.25)" },
  Mythique:   { bg: "rgba(240,180,41,0.12)",  text: "#f0b429", border: "rgba(240,180,41,0.25)" },
  "M+":       { bg: "rgba(240,180,41,0.12)",  text: "#f0b429", border: "rgba(240,180,41,0.25)" },
  Craft:      { bg: "rgba(248,113,113,0.12)", text: "#f87171", border: "rgba(248,113,113,0.25)" },
  Quête:      { bg: "rgba(156,163,175,0.12)", text: "#9ca3af", border: "rgba(156,163,175,0.25)" },
  Réputation: { bg: "rgba(156,163,175,0.12)", text: "#9ca3af", border: "rgba(156,163,175,0.25)" }
};

export const CLASS_COLORS: Record<WowClass, string> = {
  Paladin: "#f0b429",
  Mage: "#38bdf8",
  Chasseur: "#4ade80",
  Guerrier: "#c79c6e",
  Prêtre: "#ffffff",
  Démoniste: "#9482c9",
  Chaman: "#0070de",
  Druide: "#ff7c0a",
  Voleur: "#fff468",
  Moine: "#00ff98",
  "Chasseur de démons": "#a330c9",
  "Chevalier de la mort": "#c41e3a",
  Evocateur: "#33937f"
};
