'use client'
import type { Character } from '@/lib/types'
import CharacterDropdown from '../character/CharacterDropdown'
import StatChip from '../character/StatChip'

interface Props {
	characters: Character[]
	selectedId: string | null
	onSelect: (id: string) => void
}

export default function CharacterBar({ characters, selectedId, onSelect }: Props) {
	const char = characters.find((c) => c.id === selectedId) ?? characters[0]
	if (!char) return null

	return (
		<div
			style={{
				background: 'var(--surface)',
				borderBottom: '1px solid var(--border)',
				padding: '0 20px',
				height: 48,
				display: 'flex',
				alignItems: 'center',
				gap: 16,
				flexShrink: 0,
				zIndex: 10,
			}}
		>
			<span
				style={{
					fontSize: 11,
					color: 'var(--text-muted)',
					letterSpacing: '0.5px',
					whiteSpace: 'nowrap',
				}}
			>
				PERSONNAGE
			</span>
			<CharacterDropdown characters={characters} selectedId={selectedId} onSelect={onSelect} />
			<div style={{ display: 'flex', gap: 16, marginLeft: 8 }}>
				{char.gold > 0 && <StatChip icon='💰' value={char.gold.toLocaleString()} color='var(--gold-light)' />}
				{char.ilvl > 0 && <StatChip icon='⚔️' value={`iLvl ${char.ilvl}`} color='var(--text-dim)' />}
				{char.score > 0 && <StatChip icon='🏆' value={`M+ ${char.score}`} color='var(--purple)' />}
			</div>
		</div>
	)
}
