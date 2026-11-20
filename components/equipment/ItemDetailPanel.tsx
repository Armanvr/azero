'use client'
import { type CSSProperties, useEffect, useState } from 'react'
import { RARITY_COLORS, RARITY_LABELS } from '@/lib/constants'
import type { EquippedItem, ItemDetails, SourceType } from '@/lib/types'
import styles from './ItemDetailPanel.module.css'
import SourceCard from './SourceCard'

const GROUPS: [SourceType, string][] = [
	['raid', 'Raid'],
	['dungeon', 'Donjon'],
	['craft', 'Artisanat'],
]

interface Props {
	item: EquippedItem
	onClose: () => void
}

// Mount with `key={item.id}`: state starts fresh for every item
export default function ItemDetailPanel({ item, onClose }: Props) {
	const [data, setData] = useState<ItemDetails | null>(null)
	const [loading, setLoading] = useState(Boolean(item.itemId))
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		if (!item.itemId) return
		let cancelled = false
		fetch(`/api/items/${item.itemId}/sources`)
			.then((r) => {
				if (!r.ok) throw new Error()
				return r.json()
			})
			.then((json) => {
				if (cancelled) return
				if (json?.sources) setData(json as ItemDetails)
			})
			.catch(() => !cancelled && setFailed(true))
			.finally(() => !cancelled && setLoading(false))
		return () => {
			cancelled = true
		}
	}, [item.itemId])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [onClose])

	return (
		<aside
			className={styles.panel}
			aria-label="Détails de l'objet"
			style={{ '--rarity': RARITY_COLORS[item.rarity] } as CSSProperties}
		>
			<div className={styles.header}>
				<div className={styles.titleRow}>
					<div className={styles.titleBox}>
						<h2 className={styles.title}>{item.item}</h2>
						<div className={styles.slot}>
							{item.label}
							{data ? ` · ${data.type}` : ''}
						</div>
					</div>
					<button type='button' className={styles.close} onClick={onClose} aria-label='Fermer'>
						<span aria-hidden='true'>✕</span>
					</button>
				</div>

				<div className={styles.chips}>
					<span className={styles.ilvl}>iLvl {item.ilvl}</span>
					<span className={styles.rarity}>{RARITY_LABELS[item.rarity]}</span>
					{item.variant && <span className={styles.rarity}>{item.variant}</span>}
					{item.enchant && <span className={styles.enchant}>✦ {item.enchant}</span>}
				</div>
			</div>

			{data?.stats?.length ? (
				<div className={styles.stats}>
					<div className={styles.label}>STATISTIQUES</div>
					<div className={styles.statList}>
						{data.stats.map((s) => (
							<div key={s} className={styles.stat}>
								{s}
							</div>
						))}
					</div>
				</div>
			) : null}

			<div className={styles.sources}>
				<div className={styles.label}>SOURCES D&apos;OBTENTION</div>
				{loading ? (
					<div className={styles.empty}>Chargement…</div>
				) : failed ? (
					<div className={styles.empty}>Impossible de charger les sources.</div>
				) : (
					<>
						{data?.pending && (
							<div className={styles.empty}>
								Recherche des sources en cours, réessayez dans un instant
							</div>
						)}
						{GROUPS.map(([type, title]) => {
							const list = (data?.sources ?? []).filter((s) => s.type === type)
							return list.length ? (
								<div key={type} className={styles.group}>
									<h3 className={styles.groupTitle}>{title}</h3>
									<div className={styles.sourceList}>
										{list.map((s, i) => (
											<SourceCard
												key={`${s.type}|${s.instance}|${s.name}`}
												source={s}
												index={i}
												variant={item.variant}
											/>
										))}
									</div>
								</div>
							) : null
						})}
					</>
				)}
				{!loading && !failed && !data?.pending && !data?.sources.length && (
					<div className={styles.empty}>
						<div className={styles.emptyIcon} aria-hidden='true'>
							🔍
						</div>
						Aucune source identifiée dans les données Blizzard
					</div>
				)}
				{data?.wowheadUrl && (
					<a href={data.wowheadUrl} target='_blank' rel='noopener noreferrer' className={styles.wowhead}>
						Voir sur Wowhead
					</a>
				)}
			</div>
		</aside>
	)
}
