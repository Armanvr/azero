'use client'
import Image from 'next/image'
import { useState } from 'react'

import type { Character } from '@/lib/types'

const FALLBACK = ['#888', '#555'] as const

const PALETTE: Record<string, [string, string]> = {
	Paladin: ['#f0b429', '#c9960c'],
	Mage: ['#38bdf8', '#0ea5e9'],
	Chasseur: ['#4ade80', '#22c55e'],
	Guerrier: ['#c79c6e', '#8b6f4e'],
	Prêtre: ['#ffffff', '#cccccc'],
	Démoniste: ['#9482c9', '#6b5fa3'],
	Chaman: ['#0070de', '#0050a0'],
	Druide: ['#ff7c0a', '#cc6308'],
	Voleur: ['#fff468', '#ccc454'],
	Moine: ['#00ff98', '#00cc7a'],
	'Chasseur de démons': ['#a330c9', '#7e2599'],
	'Chevalier de la mort': ['#c41e3a', '#931727'],
	Evocateur: ['#33937f', '#266b5d'],
}

export default function CharAvatar({ character, size = 160 }: { character: Character; size?: number }) {
	const [imgError, setImgError] = useState(false)
	const [c1, c2] = PALETTE[character.class] ?? FALLBACK
	const id = `cg-${character.id}`

	if (character.avatarUrl && !imgError) {
		return (
			<Image
				src={character.avatarUrl}
				alt={character.name}
				width={size}
				height={size}
				onError={() => setImgError(true)}
				style={{ borderRadius: 4, objectFit: 'cover', display: 'block' }}
			/>
		)
	}

	return (
		<svg width={size} height={size} viewBox='0 0 160 160' role='img' aria-label={character.name}>
			<defs>
				<radialGradient id={id} cx='50%' cy='35%' r='60%'>
					<stop offset='0%' stopColor={c1} stopOpacity='0.3' />
					<stop offset='100%' stopColor={c2} stopOpacity='0.05' />
				</radialGradient>
			</defs>
			<rect width='160' height='160' rx='4' fill='var(--surface3)' />
			<rect width='160' height='160' rx='4' fill={`url(#${id})`} />
			<ellipse cx='80' cy='60' rx='28' ry='32' fill={c1} opacity='0.15' />
			<rect x='46' y='88' width='68' height='72' rx='10' fill={c1} opacity='0.1' />
			<text
				x='80'
				y='76'
				textAnchor='middle'
				fill={c1}
				fontSize='36'
				fontFamily='Rajdhani'
				fontWeight='700'
				opacity='0.7'
			>
				{character.name.slice(0, 2).toUpperCase()}
			</text>
			<text
				x='80'
				y='130'
				textAnchor='middle'
				fill={c1}
				fontSize='11'
				fontFamily='Exo 2'
				fontWeight='500'
				opacity='0.5'
			>
				{character.class.toUpperCase()}
			</text>
		</svg>
	)
}
