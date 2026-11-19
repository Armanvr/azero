'use client'
import type { CSSProperties } from 'react'
import { DIFF_COLORS } from '@/lib/constants'
import type { Difficulty } from '@/lib/types'
import styles from './DiffBadge.module.css'

export default function DiffBadge({ diff }: { diff: Difficulty }) {
	const c = DIFF_COLORS[diff] ?? DIFF_COLORS.Normal
	return (
		<span className={styles.badge} style={{ '--diff': c } as CSSProperties}>
			{diff}
		</span>
	)
}
