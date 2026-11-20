'use client'
import type { CSSProperties } from 'react'
import type { ItemSource } from '@/lib/types'
import styles from './SourceCard.module.css'

export default function SourceCard({
	source,
	index,
	variant,
}: {
	source: ItemSource
	index: number
	variant?: string
}) {
	return (
		<div className={styles.card} style={{ '--i': index } as CSSProperties}>
			<div className={styles.name}>{source.name}</div>

			{source.instance && (
				<div className={styles.instance}>
					<span aria-hidden='true'>📍</span>
					{source.instance}
					{source.expansion && <span className={styles.expansion}> · {source.expansion}</span>}
				</div>
			)}

			{source.difficulties?.length ? (
				<div className={styles.meta}>
					{source.difficulties.map((d) => (
						<span key={d} className={`${styles.pill} ${d === variant ? styles.pillOn : ''}`}>
							{d}
						</span>
					))}
				</div>
			) : null}

			{source.conditions && <div className={styles.conditions}>{source.conditions}</div>}
		</div>
	)
}
