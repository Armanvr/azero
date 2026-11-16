'use client'
import Image from 'next/image'
import type { CSSProperties } from 'react'
import { RARITY_COLORS } from '@/lib/constants'
import type { EquippedItem } from '@/lib/types'
import styles from './ItemSlot.module.css'

interface Props {
	slot: EquippedItem
	side: 'left' | 'right' | 'weapon'
	isActive: boolean
	onSelect: (id: string) => void
}

export default function ItemSlot({ slot, side, isActive, onSelect }: Props) {
	const hasItem = Boolean(slot.item)
	const content = (
		<>
			<span className={styles.icon}>
				{slot.iconUrl ? (
					<Image src={slot.iconUrl} alt='' width={50} height={50} />
				) : (
					<span className={styles.abbr}>{slot.label.slice(0, 2).toUpperCase()}</span>
				)}
			</span>
			{side !== 'weapon' && (
				<span className={styles.body}>
					<span className={hasItem ? styles.name : styles.empty}>{hasItem ? slot.item : slot.label}</span>
					{hasItem && <span className={styles.ilvl}>{slot.ilvl}</span>}
				</span>
			)}
		</>
	)
	// An empty slot is not selectable: plain row, not a button
	if (!hasItem) {
		return (
			<div className={styles.slot} data-side={side} data-empty title={slot.label}>
				{content}
			</div>
		)
	}
	return (
		<button
			type='button'
			className={styles.slot}
			data-side={side}
			data-active={isActive || undefined}
			title={side === 'weapon' ? slot.item : undefined}
			aria-label={side === 'weapon' ? slot.item : undefined}
			aria-pressed={isActive}
			style={{ '--rarity': RARITY_COLORS[slot.rarity] } as CSSProperties}
			onClick={() => onSelect(slot.id)}
		>
			{content}
		</button>
	)
}
