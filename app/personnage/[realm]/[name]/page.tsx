'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import CharAvatar from '@/components/character/CharAvatar'
import ItemDetailPanel from '@/components/equipment/ItemDetailPanel'
import ItemSlot from '@/components/equipment/ItemSlot'
import Header from '@/components/layout/Header'
import TalentsTab from '@/components/talents/TalentsTab'
import { apiPathFromParams } from '@/lib/characterPath'
import { RARITY_COLORS, RARITY_LABELS } from '@/lib/constants'
import type { Character } from '@/lib/types'
import styles from './page.module.css'

const TABS = [
	['gear', 'ÉQUIPEMENT'],
	['talents', 'TALENTS'],
] as const

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

function formatLastLogin(ts: number): string {
	const d = new Date(ts)
	const days = Math.round((dayStart(new Date()) - dayStart(d)) / 86_400_000)
	const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
	if (days === 0) return `aujourd'hui à ${time}`
	if (days === 1) return `hier à ${time}`
	return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CharacterPage() {
	const { realm, name } = useParams<{ realm: string; name: string }>()

	const [character, setCharacter] = useState<Character | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null)
	const [attempt, setAttempt] = useState(0)

	useEffect(() => {
		// `attempt` is only a dependency: « Réessayer » re-runs the effect
		let stale = false
		setLoading(true)
		setError(null)
		;(async () => {
			try {
				const r = await fetch(apiPathFromParams({ realm, name }))
				const j = await r.json().catch(() => null)
				if (stale) return
				if (r.ok && j?.character) setCharacter(j.character as Character)
				else setError({ message: j?.error ?? 'Réponse inattendue du serveur', notFound: r.status === 404 })
			} catch {
				if (!stale) setError({ message: 'Erreur réseau', notFound: false })
			} finally {
				if (!stale) setLoading(false)
			}
		})()
		return () => {
			stale = true
		}
	}, [realm, name, attempt])

	return (
		<div className={styles.page}>
			<Header active='personnages' />
			{loading ? (
				<div className={styles.centered}>
					<span>Chargement…</span>
				</div>
			) : error || !character ? (
				<div className={styles.centered}>
					<div className={styles.error}>{error?.message ?? 'Personnage introuvable'}</div>
					<div className={styles.actions}>
						{!error?.notFound && (
							<button type='button' className={styles.retry} onClick={() => setAttempt((n) => n + 1)}>
								Réessayer
							</button>
						)}
						<Link href='/' className={styles.retry}>
							Nouvelle recherche
						</Link>
					</div>
				</div>
			) : (
				<CharacterView character={character} realm={realm} name={name} />
			)}
		</div>
	)
}

// Mounted only while a character is loaded: selection state resets with every new fetch
function CharacterView({ character, realm, name }: { character: Character; realm: string; name: string }) {
	const [tab, setTab] = useState<'gear' | 'talents'>('gear')
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [detailOpen, setDetailOpen] = useState(false)
	const [renderFailed, setRenderFailed] = useState(false)
	const detailsBtn = useRef<HTMLButtonElement>(null)

	const all = [...character.slotsLeft, ...character.slotsRight, ...character.slotsWeapon]
	const selected = all.find((s) => s.id === selectedId && s.item) ?? all.find((s) => s.item) ?? null
	const closeDetail = () => {
		setDetailOpen(false)
		detailsBtn.current?.focus()
	}
	const renderSlot = (slot: (typeof all)[number], side: 'left' | 'right' | 'weapon') => (
		<ItemSlot key={slot.id} slot={slot} side={side} isActive={selected?.id === slot.id} onSelect={setSelectedId} />
	)
	const identity = [character.class, character.spec, character.level ? `Niveau ${character.level}` : '']
		.filter(Boolean)
		.join(' · ')
	const { stats } = character

	return (
		<>
			<main className={styles.content}>
				<div className={styles.topRow}>
					<Link href='/' className={styles.back}>
						← Personnages
					</Link>
					<div className={styles.tabs} role='tablist'>
						{TABS.map(([id, label], i) => (
							<button
								key={id}
								type='button'
								role='tab'
								id={`tab-${id}`}
								aria-selected={tab === id}
								aria-controls='tabpanel'
								tabIndex={tab === id ? 0 : -1}
								className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
								onClick={() => setTab(id)}
								onKeyDown={(e) => {
									const moves: Record<string, number> = {
										ArrowRight: i + 1,
										ArrowLeft: i - 1,
										Home: 0,
										End: TABS.length - 1,
									}
									const to = moves[e.key]
									if (to === undefined) return
									e.preventDefault()
									const next = TABS[(to + TABS.length) % TABS.length][0]
									setTab(next)
									document.getElementById(`tab-${next}`)?.focus()
								}}
							>
								{label}
							</button>
						))}
					</div>
				</div>

				<div className={styles.layout}>
					<aside className={styles.left}>
						<div className={styles.identity}>
							<h1 className={styles.name}>{character.name}</h1>
							{identity && <span className={styles.sub}>{identity}</span>}
							<span className={styles.guild}>
								{character.guild && `‹ ${character.guild} › `}
								<span className={styles.realm}>{character.realm}</span>
							</span>
						</div>
						<div className={styles.divider} aria-hidden='true'>
							<span className={styles.line} />
							<span className={styles.diamond} />
							<span className={styles.line} />
						</div>
						<div className={styles.score}>
							<span className={styles.caption}>SCORE D'ÉQUIPEMENT</span>
							<span className={styles.scoreValue}>{character.ilvl}</span>
						</div>
						{stats && (
							<div className={styles.stats}>
								<h2 className={`${styles.caption} ${styles.statsTitle}`}>STATISTIQUES</h2>
								{stats.primary.map((s) => (
									<div key={s.label} className={styles.statRow}>
										<span className={styles.statLabel}>{s.label}</span>
										<span className={styles.statValue}>{s.value.toLocaleString('fr-FR')}</span>
									</div>
								))}
								{stats.secondary.map((s) => (
									<div key={s.label} className={`${styles.statRow} ${styles.statCol}`}>
										<div className={styles.statLine}>
											<span className={styles.statLabel}>{s.label}</span>
											<span className={styles.statValue}>
												{s.pct.toLocaleString('fr-FR', {
													minimumFractionDigits: 1,
													maximumFractionDigits: 1,
												})}{' '}
												%
											</span>
										</div>
										<div className={styles.bar}>
											<div
												className={styles.barFill}
												style={{ '--w': `${Math.min(100, s.pct * 2.5)}%` } as CSSProperties}
											/>
										</div>
									</div>
								))}
							</div>
						)}
						{character.lastLogin && (
							<span className={styles.lastLogin}>
								Dernière connexion · {formatLastLogin(character.lastLogin)}
							</span>
						)}
					</aside>

					<div className={styles.right} role='tabpanel' id='tabpanel' aria-labelledby={`tab-${tab}`}>
						{tab === 'talents' ? (
							<TalentsTab realm={realm} name={name} />
						) : (
							<>
								<div className={styles.gear}>
									<div className={styles.slots}>
										{character.slotsLeft.map((s) => renderSlot(s, 'left'))}
									</div>
									<div className={styles.figure}>
										{character.renderUrl && !renderFailed ? (
											<Image
												src={character.renderUrl}
												alt={character.name}
												fill
												loading='eager'
												fetchPriority='high'
												sizes='(max-width: 1100px) 100vw, 700px'
												className={styles.render}
												onError={() => setRenderFailed(true)}
											/>
										) : (
											<CharAvatar character={character} />
										)}
									</div>
									<div className={styles.slots}>
										{character.slotsRight.map((s) => renderSlot(s, 'right'))}
									</div>
								</div>

								{character.slotsWeapon.length > 0 && (
									<div className={styles.weapons}>
										{character.slotsWeapon.map((s) => renderSlot(s, 'weapon'))}
									</div>
								)}

								{selected && (
									<div
										className={styles.selection}
										style={{ '--rarity': RARITY_COLORS[selected.rarity] } as CSSProperties}
									>
										<span className={styles.selDiamond} />
										<span className={styles.selName}>{selected.item}</span>
										<span className={styles.selMeta}>
											{selected.label} · {RARITY_LABELS[selected.rarity]} · Niveau d'objet{' '}
											{selected.ilvl}
										</span>
										{selected.enchant && (
											<span className={styles.selEnchant}>{selected.enchant}</span>
										)}
										<button
											type='button'
											ref={detailsBtn}
											className={styles.details}
											onClick={() => setDetailOpen(true)}
										>
											Détails →
										</button>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</main>

			{tab === 'gear' && detailOpen && selected && (
				<ItemDetailPanel key={selected.id} item={selected} onClose={closeDetail} />
			)}
		</>
	)
}
