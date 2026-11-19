'use client'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { pctOf } from '@/lib/professions'
import styles from './ProfessionBits.module.css'

export function ProgressBar({ skill, max }: { skill: number; max: number }) {
	const full = max > 0 && skill >= max
	return (
		<div className={styles.track} aria-hidden='true'>
			<div
				className={`${styles.fill} ${full ? styles.full : ''}`}
				style={{ '--pct': `${pctOf(skill, max)}%` } as CSSProperties}
			/>
		</div>
	)
}

// Plain <img>: Blizzard icon hosts are not all in next.config remotePatterns; falls back to the initial when the image fails
export function ProfIcon({ src, name, size = 32 }: { src?: string; name: string; size?: number }) {
	const [failed, setFailed] = useState(false)
	const box = { width: size, height: size } as CSSProperties
	if (!src || failed)
		return (
			<span className={styles.iconFallback} style={box} aria-hidden='true'>
				{name[0]}
			</span>
		)
	return (
		// biome-ignore lint/performance/noImgElement: redirecting /icon endpoint and unlisted hosts, see above
		<img
			className={styles.icon}
			src={src}
			alt=''
			width={size}
			height={size}
			loading='lazy'
			onError={() => setFailed(true)}
		/>
	)
}
