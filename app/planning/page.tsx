'use client'
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { ALERTS, COOLDOWNS, OBJECTIVES, TRACKING } from './mock-data'
import styles from './page.module.css'

// Auth is enforced by proxy.ts
const DOW = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const DAY_MS = 86_400_000

const short = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
const bar = (n: number) => ({ '--pct': `${n}%` }) as CSSProperties

function monday(d: Date) {
	return addDays(d, -((d.getDay() + 6) % 7))
}

// EU weekly reset: Wednesday 04:00 UTC (today's if not passed yet)
function nextReset(now: Date) {
	const days = (3 - now.getUTCDay() + 7) % 7
	const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 4))
	return d.getTime() > now.getTime() ? d : new Date(d.getTime() + 7 * DAY_MS)
}

export default function PlanningPage() {
	const [week, setWeek] = useState(0)
	const [objectives, setObjectives] = useState(OBJECTIVES)
	// null until mounted so server and client markup agree
	const [now, setNow] = useState<Date | null>(null)

	useEffect(() => {
		setNow(new Date())
		const id = setInterval(() => setNow(new Date()), 60_000)
		return () => clearInterval(id)
	}, [])

	// Everything date-based comes from the post-mount `now`: server and browser may disagree on the week
	const base = now && addDays(monday(now), week * 7)
	const end = base && addDays(base, 6)
	const weekLabel =
		base && end
			? `Semaine du ${base.getMonth() === end.getMonth() ? base.getDate() : short(base)} au ${short(end)}`
			: 'Semaine en cours'

	const done = objectives.filter((o) => o.done).length
	const objPct = Math.round((done / objectives.length) * 100)

	const reset = now && nextReset(now)
	const left = reset && now ? reset.getTime() - now.getTime() : 0
	const countdown = `${Math.floor(left / DAY_MS)} j ${Math.floor((left % DAY_MS) / 3_600_000)} h`
	const resetTime = reset?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

	return (
		<div className={styles.page}>
			<Header active='planning' />
			<main className={styles.main}>
				<div className={styles.titleRow}>
					<div className={styles.titles}>
						<h1 className={styles.h1}>Tableau hebdomadaire</h1>
						<span className={styles.sub}>
							Objectifs, réinitialisations et suivi de compte
							<span className={styles.demo}>Données de démonstration</span>
						</span>
					</div>
					<div className={styles.switcher}>
						<button type='button' aria-label='Semaine précédente' onClick={() => setWeek(week - 1)}>
							‹
						</button>
						<span className={styles.weekLabel}>{weekLabel}</span>
						<button type='button' aria-label='Semaine suivante' onClick={() => setWeek(week + 1)}>
							›
						</button>
					</div>
				</div>

				<div className={styles.days}>
					{DOW.map((dow, i) => {
						const d = base && addDays(base, i)
						const today = !!d && !!now && sameDay(d, now)
						return (
							<div
								key={dow}
								className={`${styles.day} ${today ? styles.today : ''} ${i > 4 ? styles.weekend : ''}`}
							>
								<div className={styles.dayText}>
									<span className={styles.dow}>{today ? 'AUJ.' : dow}</span>
									<span className={styles.num}>{d ? d.getDate() : '–'}</span>
								</div>
								{i === 2 && <span className={styles.tag}>◆ Reset</span>}
							</div>
						)
					})}
				</div>

				<div className={styles.grid}>
					<div className={styles.col}>
						<section className={`${styles.card} ${styles.objectives}`}>
							<h2 className={styles.cardTitle}>
								OBJECTIFS DE LA SEMAINE
								<span className={styles.count}>
									{done} / {objectives.length} · {objPct}%
								</span>
							</h2>
							<div className={styles.progress}>
								<div style={bar(objPct)} />
							</div>
							{objectives.map((o, i) => (
								<button
									key={o.label}
									type='button'
									aria-pressed={o.done}
									className={`${styles.obj} ${o.done ? styles.objDone : ''}`}
									onClick={() =>
										setObjectives(objectives.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))
									}
								>
									<span className={styles.box}>{o.done ? '✓' : ''}</span>
									<span className={styles.objLabel}>{o.label}</span>
									<span className={styles.objCount}>
										{o.done ? o.max : Math.min(o.cur, o.max - 1)} / {o.max}
									</span>
								</button>
							))}
						</section>

						<div>
							<div className={`${styles.trow} ${styles.thead}`}>
								<span>PERSONNAGE</span>
								<span>OBJECTIFS CLÉS</span>
								<span className={styles.right}>PROGRESSION</span>
							</div>
							{TRACKING.map((t) => {
								const n = t.chips.filter((c) => c.done).length
								return (
									<div key={t.name} className={`${styles.trow} ${styles.tbody}`}>
										<div className={styles.who}>
											<div className={styles.avatar}>{t.name[0]}</div>
											<div className={styles.whoText}>
												<span className={styles.charName}>{t.name}</span>
												<span className={styles.charClass}>{t.cls}</span>
											</div>
										</div>
										<div className={styles.chips}>
											{t.chips.map((c) => (
												<span
													key={c.label}
													className={`${styles.chip} ${c.done ? styles.chipDone : ''}`}
												>
													{c.label}
												</span>
											))}
										</div>
										<div className={styles.frac}>
											<span>
												{n} / {t.chips.length}
											</span>
											<div className={styles.track}>
												<div style={bar((n / t.chips.length) * 100)} />
											</div>
										</div>
									</div>
								)
							})}
						</div>
					</div>

					<div className={styles.col}>
						<section className={styles.reset}>
							<h2 className={styles.resetTitle}>PROCHAINE RÉINITIALISATION</h2>
							<span className={styles.countdown}>{reset ? countdown : '—'}</span>
							<span className={styles.resetDate}>
								{reset ? `${DAY_NAMES[reset.getDay()]} ${short(reset)} · ${resetTime}` : '\u00a0'}
							</span>
							<span className={styles.resetNote}>
								Donjons mythiques · Raids · Quêtes hebdomadaires · Réputation
							</span>
						</section>

						<section className={`${styles.card} ${styles.list}`}>
							<h2 className={styles.cardTitle}>ALERTES</h2>
							{ALERTS.map((a) => (
								<div key={a.title} className={styles.alert}>
									<span className={`${styles.dot} ${a.tone === 'red' ? styles.red : styles.green}`} />
									<div className={styles.alertText}>
										<span>{a.title}</span>
										<span className={styles.detail}>{a.detail}</span>
									</div>
								</div>
							))}
						</section>

						<section className={`${styles.card} ${styles.list}`}>
							<h2 className={styles.cardTitle}>COOLDOWNS DE CRAFT</h2>
							{COOLDOWNS.map((c) => (
								<div key={c.name} className={styles.cd}>
									<span>{c.name}</span>
									<span className={c.ready ? styles.green : styles.wait}>{c.status}</span>
								</div>
							))}
						</section>
					</div>
				</div>
			</main>
		</div>
	)
}
