"use client";
import { create } from "zustand";
import type { Character, SelectedItem } from "@/lib/types";

interface CharacterState {
  characters: Character[];
  selectedCharId: number | null;
  activeCategory: string;
  selectedItem: SelectedItem | null;
  setCharacters: (chars: Character[]) => void;
  selectCharacter: (id: number) => void;
  setActiveCategory: (id: string) => void;
  setSelectedItem: (item: SelectedItem | null) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  selectedCharId: null,
  activeCategory: "head",
  selectedItem: null,
  setCharacters: (characters) =>
    set((s) => ({
      characters,
      selectedCharId: s.selectedCharId ?? characters[0]?.id ?? null
    })),
  selectCharacter: (id) => set({ selectedCharId: id, selectedItem: null }),
  setActiveCategory: (id) => set({ activeCategory: id }),
  setSelectedItem: (item) => set({ selectedItem: item })
}));
