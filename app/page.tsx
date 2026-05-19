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
  const [enriching, setEnriching] = useState(false);

  async function fetchCharacters(): Promise<Character[]> {
    const r = await fetch("/api/characters");
    if (!r.ok) return [];
    const j = await r.json();
    return (j.characters ?? []) as Character[];
  }

  useEffect(() => {
    fetchCharacters()
      .then((chars) => setCharacters(chars))
      .finally(() => setLoadingChars(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const char = useMemo(
    () => characters.find((c) => c.id === selectedCharId) ?? characters[0],
    [characters, selectedCharId]
  );

  // Auto-enrich selected character if not yet enriched
  useEffect(() => {
    if (!char || char.slotsLeft.length > 0 || enriching) return;
    setEnriching(true);
    fetch(`/api/characters/${char.id}/enrich`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (data) {
          const updated = await fetchCharacters();
          setCharacters(updated);
        }
      })
      .finally(() => setEnriching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char?.id]);

  useEffect(() => {
    fetch(`/api/items/slot/${activeCategory}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setObtainable(j.items as ObtainableItemData[]));
  }, [activeCategory]);

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
        Aucun personnage disponible. Connectez votre compte Battle.net sur la page Profil.
      </div>
    );
  }

  const loadingSlots = enriching && char.slotsLeft.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Header active="home" />
      <CharacterBar characters={characters} selectedId={char.id} onSelect={selectCharacter} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* 4-column grid: [left equip] [avatar] [weapons] [right equip] */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 160px 160px 1fr", overflow: "hidden" }}>

          {/* Col 1 — Left equipment */}
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
            {loadingSlots ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 0" }}>Chargement…</div>
            ) : (
              char.slotsLeft.map((slot) => (
                <ItemSlot
                  key={slot.id}
                  slot={slot}
                  side="left"
                  isActive={selectedItem?.name === slot.item}
                  onSelect={setSelectedItem}
                />
              ))
            )}
          </div>

          {/* Col 2 — Avatar + character info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 8px",
              borderRight: "1px solid var(--border)",
              background: "var(--surface)",
              overflowY: "auto"
            }}
          >
            <div style={{ marginBottom: 8, textAlign: "center", width: "100%" }}>
              {char.title && (
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {char.title}
                </div>
              )}
              <div
                style={{
                  fontSize: 16,
                  fontFamily: "Rajdhani",
                  fontWeight: 700,
                  color: char.color,
                  letterSpacing: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {char.name}
              </div>
            </div>

            <CharAvatar character={char} size={144} />

            <div style={{ marginTop: 10, textAlign: "center", width: "100%" }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {char.race} {char.spec ? `${char.spec} ` : ""}{char.class}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {char.guild ? `‹${char.guild}› ` : ""}{char.realm}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                {char.ilvl > 0 && (
                  <span
                    style={{
                      padding: "2px 6px",
                      background: "var(--surface3)",
                      borderRadius: 3,
                      fontSize: 9,
                      color: "var(--text-dim)",
                      border: "1px solid var(--border)"
                    }}
                  >
                    iLvl {char.ilvl}
                  </span>
                )}
                {enriching && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>↻</span>}
              </div>
            </div>
          </div>

          {/* Col 3 — Weapon slots */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "center",
              padding: "16px 8px",
              borderRight: "1px solid var(--border)",
              background: "var(--surface)",
              gap: 6,
              overflowY: "auto"
            }}
          >
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "1px", marginBottom: 4, textAlign: "center" }}>
              ARMES
            </div>
            {loadingSlots ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>…</div>
            ) : char.slotsWeapon.length === 0 ? (
              <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", opacity: 0.5 }}>—</div>
            ) : (
              char.slotsWeapon.map((slot) => (
                <ItemSlot
                  key={slot.id}
                  slot={slot}
                  side="left"
                  isActive={selectedItem?.name === slot.item}
                  onSelect={setSelectedItem}
                />
              ))
            )}
          </div>

          {/* Col 4 — Right equipment */}
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
              ÉQUIPEMENT
            </div>
            {loadingSlots ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 0" }}>Chargement…</div>
            ) : (
              char.slotsRight.map((slot) => (
                <ItemSlot
                  key={slot.id}
                  slot={slot}
                  side="right"
                  isActive={selectedItem?.name === slot.item}
                  onSelect={setSelectedItem}
                />
              ))
            )}
          </div>
        </div>

        {/* Bottom — Obtainable items */}
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
