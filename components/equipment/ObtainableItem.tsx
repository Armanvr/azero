'use client'
import { RARITY_COLORS } from '@/lib/constants'
import type { ObtainableItemData, SelectedItem } from '@/lib/types'
import RarityDot from './RarityDot'

interface Props {
	item: ObtainableItemData
	index: number
	isActive: boolean
	onSelect: (item: SelectedItem) => void
}

export default function ObtainableItem({ item, index, isActive, onSelect }: Props) {
	const rc = RARITY_COLORS[item.rarity] || '#9d9d9d'
	return (
		<button
			type='button'
			onClick={() => onSelect({ name: item.name, ilvl: item.ilvl, rarity: item.rarity, isSet: item.isSet })}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '8px 10px',
				borderRadius: 4,
				background: isActive ? 'var(--surface3)' : 'var(--surface2)',
				border: `1px solid ${isActive ? `${rc}88` : 'var(--border)'}`,
				cursor: 'pointer',
				transition: 'all 0.15s',
				animation: `fadeIn 0.2s ease ${index * 0.04}s both`,
			}}
			onMouseEnter={(e) => {
				if (!isActive) {
					e.currentTarget.style.borderColor = `${rc}66`
					e.currentTarget.style.background = 'var(--surface3)'
				}
			}}
			onMouseLeave={(e) => {
				if (!isActive) {
					e.currentTarget.style.borderColor = 'var(--border)'
					e.currentTarget.style.background = 'var(--surface2)'
				}
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 3,
					background: `${rc}18`,
					border: `1px solid ${rc}44`,
					flexShrink: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<span style={{ fontSize: 10, color: rc, fontFamily: 'Rajdhani', fontWeight: 700 }}>{item.ilvl}</span>
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 700,
						color: rc,
						fontFamily: 'Rajdhani',
						letterSpacing: '0.4px',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						textTransform: 'uppercase',
					}}
				>
					{item.name}
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
					<RarityDot rarity={item.rarity} />
					{item.isSet && (
						<span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.5px' }}>
							SET
						</span>
					)}
					<span
						style={{
							fontSize: 9,
							color: 'var(--text-muted)',
							display: 'flex',
							alignItems: 'center',
							gap: 3,
						}}
					>
						<span style={{ opacity: 0.6 }}>👥</span> {item.count}
					</span>
				</div>
			</div>
		</button>
	)
}
