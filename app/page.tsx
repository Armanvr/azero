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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
        Chargement…
      </div>
    );
  }

  if (!char) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
        Aucun personnage disponible.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Header active="home" />
      <CharacterBar characters={characters} selectedId={char.id} onSelect={selectCharacter} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 240px 1fr", overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              overflowY: "auto",
              borderRight: "1px solid var(--border)"
            }}
          >
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "1px", marginBottom: 4 }}>
              ÉQUIPEMENT
            </div>
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              borderRight: "1px solid var(--border)",
              background: "var(--surface)"
            }}
          >
            <div style={{ marginBottom: 10, textAlign: "center" }}>
              <div
                style={{
                  fontSize: 20,
                  fontFamily: "Rajdhani",
                  fontWeight: 700,
                  color: char.color,
                  letterSpacing: 1
                }}
              >
                {char.name}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{char.title}</div>
            </div>
            <CharAvatar character={char} size={160} />
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                {char.race} {char.spec} {char.class}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                ‹{char.guild}› {char.realm}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "center" }}>
                <span
                  style={{
                    padding: "3px 8px",
                    background: "var(--surface3)",
                    borderRadius: 3,
                    fontSize: 10,
                    color: "var(--text-dim)",
                    border: "1px solid var(--border)"
                  }}
                >
                  iLvl {char.ilvl}
                </span>
                <span
                  style={{
                    padding: "3px 8px",
                    background: "var(--purple-dim)",
                    borderRadius: 3,
                    fontSize: 10,
                    color: "var(--purple)",
                    border: "1px solid rgba(168,85,247,0.2)"
                  }}
                >
                  M+ {char.score}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              overflowY: "auto"
            }}
          >
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "1px", marginBottom: 4 }}>
              ÉQUIPEMENT RESTANT
            </div>
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

        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
            flexShrink: 0,
            height: 240,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 2,
              padding: "8px 16px 0",
              borderBottom: "1px solid var(--border)",
              overflowX: "auto"
            }}
          >
            {CATEGORY_TABS.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: "5px 14px",
                    background: "transparent",
                    border: "none",
                    borderBottom: isActive ? "2px solid var(--gold)" : "2px solid transparent",
                    color: isActive ? "var(--gold-light)" : "var(--text-muted)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    fontFamily: "'Exo 2', sans-serif",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s"
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 6
              }}
            >
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
