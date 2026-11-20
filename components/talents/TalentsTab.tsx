'use client'
import { useEffect, useState } from 'react'
import { apiPathFromParams } from '@/lib/characterPath'
import type { CharacterTalents } from '@/lib/types'
import styles from './Talents.module.css'
import TalentTreeView from './TalentTreeView'

export default function TalentsTab({ realm, name }: { realm: string; name: string }) {
	const [talents, setTalents] = useState<CharacterTalents | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [attempt, setAttempt] = useState(0)
	const [loadoutIdx, setLoadoutIdx] = useState(0)

	useEffect(() => {
		// `attempt` is only a dependency: « Réessayer » re-runs the effect
		let stale = false
		setLoading(true)
		setError(null)
		;(async () => {
			try {
				const r = await fetch(`${apiPathFromParams({ realm, name })}/talents`)
				const j = await r.json().catch(() => null)
				if (stale) return
				if (r.ok && j?.talents) {
					const t = j.talents as CharacterTalents
					setTalents(t)
					setLoadoutIdx(
						Math.max(
							0,
							t.loadouts.findIndex((l) => l.active),
						),
					)
				} else setError(j?.error ?? 'Réponse inattendue du serveur')
			} catch {
				if (!stale) setError('Erreur réseau')
			} finally {
				if (!stale) setLoading(false)
			}
		})()
		return () => {
			stale = true
		}
	}, [realm, name, attempt])

	if (loading) return <div className={styles.state}>Chargement…</div>
	if (error || !talents)
		return (
			<div className={styles.state}>
				<span className={styles.error}>{error ?? 'Talents indisponibles pour ce personnage'}</span>
				<button type='button' className={styles.retry} onClick={() => setAttempt((n) => n + 1)}>
					Réessayer
				</button>
			</div>
		)

	const loadout = talents.loadouts[loadoutIdx]
	if (!loadout) return <div className={styles.state}>Talents indisponibles pour ce personnage</div>

	return (
		<div className={styles.tab}>
			<div className={styles.header}>
				<div className={styles.spec}>
					{talents.specIcon && (
						// biome-ignore lint/performance/noImgElement: Blizzard media URL, same as the slot icons
						<img src={talents.specIcon} alt='' className={styles.specIcon} />
					)}
					<h2 className={styles.specName}>{talents.spec}</h2>
					{talents.heroTree && <span className={styles.hero}>{talents.heroTree}</span>}
				</div>
				{talents.loadouts.length > 1 && (
					<div className={styles.loadouts}>
						{talents.loadouts.map((l, i) => (
							<button
								key={l.name}
								type='button'
								aria-pressed={i === loadoutIdx}
								className={styles.loadout}
								onClick={() => setLoadoutIdx(i)}
							>
								{l.name}
							</button>
						))}
					</div>
				)}
			</div>
			<div className={styles.trees}>
				{loadout.trees.map((t) => (
					<TalentTreeView key={`${loadout.name}-${t.kind}`} tree={t} />
				))}
			</div>
		</div>
	)
}
