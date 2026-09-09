'use client'
import { RARITY_COLORS } from '@/lib/constants'
import type { ItemRarity } from '@/lib/types'

export default function RarityDot({ rarity }: { rarity: ItemRarity }) {
	return (
		<span
			style={{
				display: 'inline-block',
				width: 8,
				height: 8,
				borderRadius: '50%',
				background: RARITY_COLORS[rarity] || '#9d9d9d',
				flexShrink: 0,
			}}
		/>
	)
}
