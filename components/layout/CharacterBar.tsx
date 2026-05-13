"use client";
import type { Character } from "@/lib/types";
import CharacterDropdown from "../character/CharacterDropdown";
import StatChip from "../character/StatChip";

interface Props {
  characters: Character[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function CharacterBar({ characters, selectedId, onSelect }: Props) {
  const char = characters.find((c) => c.id === selectedId) ?? characters[0];
  if (!char) return null;

  return (
    <div className="bg-surface border-b border-border px-5 h-12 flex items-center gap-4 shrink-0 z-10">
      <span className="text-[11px] text-text-muted tracking-[0.5px] whitespace-nowrap">
        PERSONNAGE
      </span>
      <CharacterDropdown characters={characters} selectedId={selectedId} onSelect={onSelect} />
      <div className="flex gap-4 ml-2">
        <StatChip icon="💰" value={char.gold.toLocaleString()} color="var(--gold-light)" />
        <StatChip icon="⚔️" value={`iLvl ${char.ilvl}`} color="var(--text-dim)" />
        <StatChip icon="🏆" value={`M+ ${char.score}`} color="var(--purple)" />
      </div>
    </div>
  );
}
