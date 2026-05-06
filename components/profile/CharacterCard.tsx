"use client";
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

export default function CharacterCard({ char }: { char: BnetCharacter }) {
  const classColor = CLASS_COLORS[char.classId] ?? 'var(--text)';
  const factionColor = FACTION_COLORS[char.faction];

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
        {char.raceName} {char.className}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{char.realm}</span>
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
  );
}
