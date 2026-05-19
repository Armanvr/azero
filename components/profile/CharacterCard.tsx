"use client";
import { useState } from "react";
import type { BnetCharacter } from "@/lib/types";

const FACTION_COLORS = {
  horde: 'var(--red)',
  alliance: '#6CA6F0',
} as const;

const CLASS_COLORS: Record<number, string> = {
  1: '#C69B3A',
  2: '#F48CBA',
  3: '#AAD372',
  4: '#FFF468',
  5: '#FFFFFF',
  6: '#C41E3A',
  7: '#0070DD',
  8: '#3FC7EB',
  9: '#8788EE',
  10: '#00FF98',
  11: '#FF7C0A',
  12: '#A330C9',
  13: '#33937F',
};

interface Props {
  char: BnetCharacter;
  onRefreshed?: (updated: BnetCharacter) => void;
}

export default function CharacterCard({ char, onRefreshed }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const classColor = CLASS_COLORS[char.classId] ?? 'var(--text)';
  const factionColor = FACTION_COLORS[char.faction];
  const charId = `${char.name.toLowerCase()}-${char.realmSlug}`;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/characters/${charId}/enrich`, { method: 'POST' });
      if (res.ok && onRefreshed) {
        const data = await res.json();
        onRefreshed(data.character as BnetCharacter);
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: classColor,
            fontFamily: 'Rajdhani',
            letterSpacing: 0.5,
          }}
        >
          {char.name}
        </span>
        <span style={{ fontSize: 10, color: factionColor, fontWeight: 700, letterSpacing: 0.5 }}>
          {char.faction === 'horde' ? 'HORDE' : 'ALLIANCE'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
        {char.raceName} {char.spec ? `${char.spec} ` : ''}{char.className}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{char.realm}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {char.ilvl != null && char.ilvl > 0 && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                background: 'var(--surface3)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                color: 'var(--gold-light)',
              }}
            >
              iLvl {char.ilvl}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              padding: '2px 6px',
              background: 'var(--surface3)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: 'var(--text-dim)',
            }}
          >
            Niv. {char.level}
          </span>
        </div>
      </div>
      {char.guildName && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>‹{char.guildName}›</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
          {char.enrichedAt
            ? `Màj ${new Date(char.enrichedAt).toLocaleDateString('fr-FR')}`
            : 'Non enrichi'}
        </span>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            fontSize: 10,
            padding: '2px 8px',
            background: 'var(--surface2)',
            border: '1px solid var(--border2)',
            borderRadius: 3,
            color: refreshing ? 'var(--text-muted)' : 'var(--text-dim)',
            cursor: refreshing ? 'default' : 'pointer',
            fontFamily: "'Exo 2', sans-serif",
          }}
        >
          {refreshing ? '…' : '↻'}
        </button>
      </div>
    </div>
  );
}
