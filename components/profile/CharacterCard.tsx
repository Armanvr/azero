'use client'
import Link from 'next/link'
import { type CSSProperties, useState } from 'react'
import { characterPath, charId as makeCharId } from '@/lib/characterPath'
import { CLASS_COLORS } from '@/lib/constants'
import type { BnetCharacter } from '@/lib/types'
import styles from './CharacterCard.module.css'

interface Props {
	char: BnetCharacter
	isFavorite: boolean
	isSubFavorite: boolean
	// a favourites save is in flight: stars are locked so clicks cannot overwrite each other
	saving: boolean
	onRefreshed: (updated: BnetCharacter) => void
	onFavoriteToggle: (charId: string) => void
	onSubFavoriteToggle: (charId: string) => void
}

export default function CharacterCard({
	char,
	isFavorite,
	isSubFavorite,
	saving,
	onRefreshed,
	onFavoriteToggle,
	onSubFavoriteToggle,
}: Props) {
	const [refreshing, setRefreshing] = useState(false)
	const [refreshError, setRefreshError] = useState(false)
	const charId = makeCharId(char.name, char.realmSlug)

	async function handleRefresh() {
		setRefreshing(true)
		setRefreshError(false)
		try {
			const res = await fetch(`/api/characters/${charId}/enrich`, { method: 'POST' })
			if (!res.ok) throw new Error()
			onRefreshed((await res.json()).character as BnetCharacter)
		} catch {
			setRefreshError(true)
		} finally {
			setRefreshing(false)
		}
	}

	return (
		<div
			className={styles.card}
			data-fav={isFavorite ? 'main' : isSubFavorite ? 'sub' : undefined}
			style={{ '--class-color': CLASS_COLORS[char.classId] ?? 'var(--text)' } as CSSProperties}
		>
			<div className={styles.stars}>
				<button
					type='button'
					className={styles.star}
					data-kind='main'
					data-on={isFavorite || undefined}
					aria-label={`${isFavorite ? 'Retirer des favoris' : 'Définir comme personnage principal'} : ${char.name}`}
					aria-pressed={isFavorite}
					disabled={saving}
					onClick={() => onFavoriteToggle(charId)}
					title={`${isFavorite ? 'Retirer des favoris' : 'Définir comme personnage principal'} : ${char.name}`}
				>
					★
				</button>
				{!isFavorite && (
					<button
						type='button'
						className={styles.star}
						data-kind='sub'
						data-on={isSubFavorite || undefined}
						aria-label={`${isSubFavorite ? 'Retirer des sous-favoris' : 'Ajouter aux sous-favoris'} : ${char.name}`}
						aria-pressed={isSubFavorite}
						disabled={saving}
						onClick={() => onSubFavoriteToggle(charId)}
						title={`${isSubFavorite ? 'Retirer des sous-favoris' : 'Ajouter aux sous-favoris'} : ${char.name}`}
					>
						☆
					</button>
				)}
			</div>

			<div className={`${styles.row} ${styles.head}`}>
				<Link href={characterPath(char.name, char.realmSlug)} className={styles.name}>
					{char.name}
				</Link>
				<span className={styles.faction} data-faction={char.faction}>
					{char.faction === 'horde' ? 'HORDE' : 'ALLIANCE'}
				</span>
			</div>
			<div className={styles.desc}>
				{char.raceName} {char.spec ? `${char.spec} ` : ''}
				{char.className}
			</div>
			<div className={`${styles.row} ${styles.realmRow}`}>
				<span className={styles.realm}>{char.realm}</span>
				<div className={styles.chips}>
					{char.ilvl != null && char.ilvl > 0 && (
						<span className={styles.chip} data-kind='ilvl'>
							iLvl {char.ilvl}
						</span>
					)}
					<span className={styles.chip}>Niv. {char.level}</span>
				</div>
			</div>
			{char.guildName && <div className={styles.guild}>‹{char.guildName}›</div>}
			{refreshError && (
				<div role='alert' className={styles.error}>
					Actualisation impossible. Réessayez.
				</div>
			)}
			<div className={`${styles.row} ${styles.footer}`}>
				<span className={styles.updated}>
					{char.enrichedAt ? `Màj ${new Date(char.enrichedAt).toLocaleDateString('fr-FR')}` : 'Non enrichi'}
				</span>
				<button
					type='button'
					className={styles.refresh}
					onClick={handleRefresh}
					disabled={refreshing}
					aria-label={`Actualiser ${char.name}`}
				>
					{refreshing ? '…' : '↻'}
				</button>
			</div>
		</div>
	)
}
