'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { characterPath } from '@/lib/characterPath'
import type { Profession, ProfessionCharacter } from '@/lib/types'
import styles from './page.module.css'

const isFull = (p: Profession) => p.max > 0 && p.skill >= p.max
const pct = (p: Profession) =>
	({ '--pct': `${p.max > 0 ? Math.min(100, (p.skill / p.max) * 100) : 0}%` }) as CSSProperties
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

function Bar({ p }: { p: Profession }) {
	return (
		<div className={styles.track}>
			<div className={`${styles.fill} ${isFull(p) ? styles.full : ''}`} style={pct(p)} />
		</div>
	)
}

function ProfCell({ p }: { p?: Profession }) {
	if (!p) return <span className={styles.none}>—</span>
	return (
		<div className={styles.prof}>
			<div className={styles.profHead}>
				<span className={styles.profName}>{p.name}</span>
				<span className={styles.profSkill}>
					{p.skill} / {p.max}
				</span>
			</div>
			<Bar p={p} />
		</div>
	)
}

export default function MetiersPage() {
	const router = useRouter()
	const [characters, setCharacters] = useState<ProfessionCharacter[] | null>(null)
	const [error, setError] = useState(false)

	const load = useCallback(async () => {
		setError(false)
		setCharacters(null)
		try {
			const res = await fetch('/api/professions')
			if (res.status === 401) return router.replace('/auth')
			if (!res.ok) throw new Error()
			setCharacters((await res.json()).characters)
		} catch {
			setError(true)
		}
	}, [router])

	useEffect(() => {
		load()
	}, [load])

	// Per distinct profession: the most recent expansion tier, then the best skill within it
	const summary = new Map<string, Profession>()
	for (const c of characters ?? [])
		for (const p of c.professions) {
			const best = summary.get(p.name)
			if (
				!best ||
				(p.tier ?? 0) > (best.tier ?? 0) ||
				((p.tier ?? 0) === (best.tier ?? 0) && p.skill > best.skill)
			)
				summary.set(p.name, p)
		}
	const summaryList = [...summary.values()]

	let body: React.ReactNode
	if (error) {
		body = (
			<div className={styles.state}>
				<p>Impossible de charger les métiers.</p>
				<button type='button' className={styles.retry} onClick={load}>
					Réessayer
				</button>
			</div>
		)
	} else if (!characters) {
		body = <div className={styles.state}>Chargement…</div>
	} else if (characters.length === 0) {
		body = (
			<div className={styles.state}>
				<p>Aucun personnage : liez un compte Battle.net pour afficher vos métiers.</p>
				<Link href='/profil'>Lier mon compte Battle.net</Link>
			</div>
		)
	} else {
		body = (
			<>
				{summaryList.length > 0 && (
					<div
						className={styles.summary}
						style={{ '--cols': Math.min(6, summaryList.length) } as CSSProperties}
					>
						{summaryList.map((p) => (
							<div key={p.name} className={styles.cell}>
								<span className={styles.cellName}>{p.name}</span>
								<span className={`${styles.cellValue} ${isFull(p) ? styles.gold : ''}`}>{p.skill}</span>
								<Bar p={p} />
							</div>
						))}
					</div>
				)}

				<div>
					<div className={`${styles.row} ${styles.head}`}>
						<span>PERSONNAGE</span>
						<span>NIV.</span>
						<span>MÉTIER PRINCIPAL</span>
						<span>MÉTIER SECONDAIRE</span>
						<span />
					</div>
					{characters.map((c) => (
						<div key={c.id} className={`${styles.row} ${styles.body}`}>
							<div className={styles.who}>
								<div className={styles.avatar}>{c.name[0]}</div>
								<div className={styles.whoText}>
									<span className={styles.charName}>{c.name}</span>
									<span className={styles.charClass}>
										{c.class} · {c.spec}
									</span>
								</div>
							</div>
							<span className={styles.level}>{c.level}</span>
							<ProfCell p={c.professions[0]} />
							<ProfCell p={c.professions[1]} />
							<Link
								className={styles.more}
								href={characterPath(c.name, c.realmSlug)}
								aria-label={`Voir la page de ${c.name}`}
							>
								···
							</Link>
						</div>
					))}
				</div>

				<div className={styles.bottom}>
					<section className={styles.card}>
						<h2 className={styles.cardTitle}>COOLDOWNS DE MÉTIERS</h2>
						<p className={styles.soon}>Bientôt disponible</p>
					</section>
					<section className={styles.card}>
						<h2 className={styles.cardTitle}>CRAFTABLES DISPONIBLES</h2>
						<p className={styles.soon}>Bientôt disponible</p>
					</section>
				</div>
			</>
		)
	}

	return (
		<div className={styles.page}>
			<Header active='compte' />
			<main className={styles.main}>
				<div className={styles.titleRow}>
					<div className={styles.titles}>
						<h1 className={styles.h1}>Métiers du compte</h1>
						{characters && (
							<span className={styles.sub}>
								{plural(characters.length, 'personnage')} · {plural(summaryList.length, 'métier')}
							</span>
						)}
					</div>
					<div className={styles.tabs}>
						<span className={`${styles.tab} ${styles.tabActive}`}>MÉTIERS</span>
						<span className={styles.tab} aria-disabled='true' title='Bientôt disponible'>
							CRAFTABLES
						</span>
						<span className={styles.tab} aria-disabled='true' title='Bientôt disponible'>
							COOLDOWNS
						</span>
					</div>
				</div>
				{body}
			</main>
		</div>
	)
}
