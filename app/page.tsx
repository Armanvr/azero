"use client";
import { useEffect, useMemo, useState } from "react";
import CharAvatar from "@/components/character/CharAvatar";
import CharacterBar from "@/components/layout/CharacterBar";
import Header from "@/components/layout/Header";
import ItemDetailPanel from "@/components/equipment/ItemDetailPanel";
import ItemSlot from "@/components/equipment/ItemSlot";
import ObtainableItem from "@/components/equipment/ObtainableItem";
import type { Character, ObtainableItemData } from "@/lib/types";
import { useCharacterStore } from "@/store/character-store";

const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: "head", label: "TÊTE" },
  { id: "shoulders", label: "ÉPAULES" },
  { id: "chest", label: "TORSE" },
  { id: "legs", label: "JAMBES" }
];

export default function HomePage() {
  const {
    characters,
    selectedCharId,
    activeCategory,
    selectedItem,
    setCharacters,
    selectCharacter,
    setActiveCategory,
    setSelectedItem
  } = useCharacterStore();

  const [obtainable, setObtainable] = useState<ObtainableItemData[]>([]);
  const [loadingChars, setLoadingChars] = useState(true);

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => (r.ok ? r.json() : { characters: [] }))
      .then((j) => setCharacters(j.characters as Character[]))
      .finally(() => setLoadingChars(false));
  }, [setCharacters]);

  useEffect(() => {
    fetch(`/api/items/slot/${activeCategory}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setObtainable(j.items as ObtainableItemData[]));
  }, [activeCategory]);

  const char = useMemo(
    () => characters.find((c) => c.id === selectedCharId) ?? characters[0],
    [characters, selectedCharId]
  );

  if (loadingChars) {
    return (
      <div className="flex items-center justify-center h-screen text-text-muted">
        Chargement…
      </div>
    );
  }

  if (!char) {
    return (
      <div className="flex items-center justify-center h-screen text-text-muted">
        Aucun personnage disponible.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header active="home" />
      <CharacterBar characters={characters} selectedId={char.id} onSelect={selectCharacter} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 grid grid-cols-[1fr_240px_1fr] overflow-hidden">
          <div className="px-3 py-[14px] flex flex-col gap-[6px] overflow-y-auto border-r border-border">
            <div className="text-[10px] text-text-muted tracking-[1px] mb-1">ÉQUIPEMENT</div>
            {char.slotsLeft.map((slot) => (
              <ItemSlot
                key={slot.id}
                slot={slot}
                side="left"
                isActive={selectedItem?.name === slot.item}
                onSelect={setSelectedItem}
              />
            ))}
          </div>

          <div className="flex flex-col items-center justify-center p-4 border-r border-border bg-surface">
            <div className="mb-[10px] text-center">
              <div
                className="text-[20px] font-rajdhani font-bold tracking-[1px]"
                style={{ color: char.color }}
              >
                {char.name}
              </div>
              <div className="text-[10px] text-text-dim mt-0.5">{char.title}</div>
            </div>
            <CharAvatar character={char} size={160} />
            <div className="mt-3 text-center">
              <div className="text-[10px] text-text-muted mb-1">
                {char.race} {char.spec} {char.class}
              </div>
              <div className="text-[10px] text-text-muted">
                ‹{char.guild}› {char.realm}
              </div>
              <div className="mt-[10px] flex gap-[6px] justify-center">
                <span className="px-2 py-[3px] bg-surface3 rounded-[3px] text-[10px] text-text-dim border border-border">
                  iLvl {char.ilvl}
                </span>
                <span className="px-2 py-[3px] bg-purple-dim rounded-[3px] text-[10px] text-purple border border-[rgba(168,85,247,0.2)]">
                  M+ {char.score}
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 py-[14px] flex flex-col gap-[6px] overflow-y-auto">
            <div className="text-[10px] text-text-muted tracking-[1px] mb-1">ÉQUIPEMENT RESTANT</div>
            {char.slotsRight.map((slot) => (
              <ItemSlot
                key={slot.id}
                slot={slot}
                side="right"
                isActive={selectedItem?.name === slot.item}
                onSelect={setSelectedItem}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-surface shrink-0 h-[240px] flex flex-col">
          <div className="flex gap-0.5 px-4 pt-2 border-b border-border overflow-x-auto">
            {CATEGORY_TABS.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-[14px] py-[5px] bg-transparent border-none border-b-2 text-[11px] font-semibold tracking-[0.5px] cursor-pointer font-exo whitespace-nowrap transition-all duration-150
                    ${isActive ? "border-b-gold text-gold-light" : "border-b-transparent text-text-muted"}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-[10px]">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[6px]">
              {obtainable.map((item, i) => (
                <ObtainableItem
                  key={item.name}
                  item={item}
                  index={i}
                  isActive={selectedItem?.name === item.name}
                  onSelect={setSelectedItem}
                />
              ))}
            </div>
          </div>
        </div>

        {selectedItem && <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </div>
    </div>
  );
}
