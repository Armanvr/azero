'use client'
import type { CSSProperties } from 'react'
import type { ItemSource } from '@/lib/types'
import DiffBadge from './DiffBadge'
import styles from './SourceCard.module.css'

export default function SourceCard({ source, index }: { source: ItemSource; index: number }) {
	return (
		<div className={styles.card} style={{ '--i': index } as CSSProperties}>
			<div className={styles.boss}>{source.boss}</div>

			<div className={styles.instance}>
				<span aria-hidden='true'>📍</span>
				{source.instance}
			</div>

			<div className={styles.meta}>
				<DiffBadge diff={source.difficulty} />
				<span className={styles.ilvl}>
					<span aria-hidden='true'>⚔️</span> {source.ilvlRange}
				</span>
				<span className={styles.drop}>{source.dropRate}</span>
			</div>
		</div>
	)
}
