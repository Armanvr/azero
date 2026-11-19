'use client'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Header from '@/components/layout/Header'
import { ProfIcon, ProgressBar } from '@/components/professions/ProfessionBits'
import Input from '@/components/ui/Input'
import { normalize, type RecipeStatus, recipeStatus, STATUS_LABELS, skillOf, tierStats } from '@/lib/professions'
import type { RecipeDetail, TierCatalog } from '@/lib/types'
import { useProfessionCharacters } from '@/lib/useProfessionCharacters'
import styles from './page.module.css'

type Filter = 'all' | 'known' | 'missing'
const FILTERS: Array<[Filter, string]> = [
	['all', 'Toutes'],
	['known', 'Apprises'],
	['missing', 'Manquantes'],
]
const NOT_PROVIDED = 'Non fourni par Blizzard'
const iconUrl = (id: number) => `/api/professions/recipes/${id}/icon`
const collator = new Intl.Collator('fr')

const safeDecode = (s: string) => {
	try {
		return decodeURIComponent(s)
	} catch {
		return s
	}
}

function Status({ status }: { status: RecipeStatus }) {
	return <span className={`${styles.status} ${styles[status]}`}>{STATUS_LABELS[status]}</span>
}

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
	return (
		<div className={styles.field}>
			<div className={styles.label}>{label}</div>
			{children ?? <div className={styles.dim}>{NOT_PROVIDED}</div>}
		</div>
	)
}

// Mount with `key={recipeId}`: state starts fresh for every recipe
function RecipePanel({
	id,
	profession,
	expansion,
	status,
	onClose,
}: {
	id: number
	profession: string
	expansion: string
	status: RecipeStatus
	onClose: () => void
}) {
	const [data, setData] = useState<RecipeDetail | null>(null)
	const [failed, setFailed] = useState(false)
	const [attempt, setAttempt] = useState(0)

	useEffect(() => {
		let cancelled = false
		fetch(`/api/professions/recipes/${id}`)
			.then((r) => {
				if (!r.ok) throw new Error()
				return r.json()
			})
			.then((json) => !cancelled && setData(json as RecipeDetail))
			.catch(() => !cancelled && setFailed(true))
		return () => {
			cancelled = true
		}
	}, [id, attempt])

	const closeRef = useRef<HTMLButtonElement>(null)
	useEffect(() => closeRef.current?.focus(), [])

	// Give focus back to the recipe button that opened the panel
	const close = useCallback(() => {
		onClose()
		document.querySelector<HTMLElement>(`[data-recipe='${id}']`)?.focus()
	}, [onClose, id])

	useEffect(() => {
		// Escape in a field (search, sort) belongs to the field, not the panel
		const onKey = (e: KeyboardEvent) =>
			e.key === 'Escape' && !(e.target as Element).closest('input, select, textarea') && close()
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [close])

	const q = data?.craftedQuantity
	const qty = q?.value ?? (q?.min !== undefined && q?.max !== undefined ? `${q.min}–${q.max}` : undefined)

	return (
		<aside className={styles.panel} aria-label='Détails de la recette'>
			<div className={styles.panelHead}>
				<ProfIcon src={data?.icon ? iconUrl(id) : undefined} name={data?.name ?? '?'} size={44} />
				<div className={styles.panelTitle}>
					<h2 className={styles.h2}>{data?.name ?? 'Recette'}</h2>
					<div className={styles.dim}>
						{profession} · {expansion}
					</div>
					<Status status={status} />
				</div>
				<button ref={closeRef} type='button' className={styles.close} onClick={close} aria-label='Fermer'>
					<span aria-hidden='true'>✕</span>
				</button>
			</div>
			<div className={styles.panelBody}>
				{failed ? (
					<div className={styles.dim}>
						Impossible de charger la recette.{' '}
						<button
							type='button'
							className={styles.link}
							onClick={() => {
								setFailed(false)
								setAttempt((a) => a + 1)
							}}
						>
							Réessayer
						</button>
					</div>
				) : !data ? (
					<div className={styles.dim}>Chargement…</div>
				) : (
					<>
						<Field label='DESCRIPTION'>
							{data.description && <p className={styles.text}>{data.description}</p>}
						</Field>
						<Field label='RANG'>
							{data.rank !== undefined && <p className={styles.text}>{data.rank}</p>}
						</Field>
						<Field label='OBJETS FABRIQUÉS'>
							{data.craftedItems?.length ? (
								<ul className={styles.items}>
									{data.craftedItems.map((i) => (
										<li key={i.id}>
											{i.name}
											{qty !== undefined && ` × ${qty}`}
										</li>
									))}
								</ul>
							) : undefined}
						</Field>
						<Field label='COMPOSANTS'>
							{data.reagents?.length ? (
								<ul className={styles.items}>
									{data.reagents.map((r) => (
										<li key={r.id}>
											{r.quantity} × {r.name}
										</li>
									))}
								</ul>
							) : undefined}
						</Field>
						<Field label='EMPLACEMENTS OPTIONNELS'>
							{data.optionalSlots?.length ? (
								<ul className={styles.items}>
									{data.optionalSlots.map((s) => (
										<li key={s}>{s}</li>
									))}
								</ul>
							) : undefined}
						</Field>
					</>
				)}
			</div>
		</aside>
	)
}

function Detail() {
	const router = useRouter()
	const pathname = usePathname()
	const search = useSearchParams()
	const params = useParams<{ charId: string; professionId: string }>()
	const { characters, error, load } = useProfessionCharacters()
	const [filter, setFilter] = useState<Filter>('all')
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState<'name' | 'status'>('name')
	const [catalog, setCatalog] = useState<{ key: string; data?: TierCatalog } | null>(null)
	const [attempt, setAttempt] = useState(0)

	const char = characters?.find((c) => c.id === safeDecode(params.charId))
	const prof = char?.professions.find((p) => String(p.id) === params.professionId)
	const tierParam = Number(search.get('tier'))
	const tier = prof?.tiers.find((t) => t.id === tierParam) ?? prof?.tiers[0]
	const recipeId = Number(search.get('recette')) || undefined
	const wantCatalog = Boolean(prof?.hasRecipes && tier)
	const key = `${prof?.id}/${tier?.id}`

	useEffect(() => {
		if (!wantCatalog) return
		let cancelled = false
		fetch(`/api/professions/${prof?.id}/tiers/${tier?.id}`)
			.then((r) => {
				if (!r.ok) throw new Error()
				return r.json()
			})
			.then((data: TierCatalog) => !cancelled && setCatalog({ key, data }))
			.catch(() => !cancelled && setCatalog({ key }))
		return () => {
			cancelled = true
		}
	}, [wantCatalog, key, attempt, prof?.id, tier?.id])

	const setParam = useCallback(
		(name: string, value?: number) => {
			const p = new URLSearchParams(search.toString())
			if (value === undefined) p.delete(name)
			else p.set(name, String(value))
			if (name === 'tier') p.delete('recette')
			router.replace(`${pathname}?${p}`, { scroll: false })
		},
		[router, pathname, search],
	)
	const closePanel = useCallback(() => setParam('recette'), [setParam])

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
	} else if (!char || !prof) {
		body = (
			<div className={styles.state}>
				<p>Métier ou personnage introuvable.</p>
			</div>
		)
	} else {
		const sk = skillOf(prof, tier)
		const catState = wantCatalog && catalog?.key === key ? catalog : null
		const catLoading = wantCatalog && !catState
		const catFailed = Boolean(catState && !catState.data)
		const known = new Map((tier?.knownRecipes ?? []).map((r) => [r.id, r]))
		const stats = char.professionsKnown && catState?.data ? tierStats(catState.data, new Set(known.keys())) : null
		const statusOf = (id: number) => recipeStatus(known.has(id), char.professionsKnown, Boolean(catState?.data))

		// Catalog by category, plus known recipes the catalog does not list; known recipes alone when the catalog is unavailable
		const groups = catState?.data
			? [...catState.data.categories]
			: [{ name: 'Recettes apprises', recipes: [...known.values()] }]
		if (catState?.data) {
			const inCatalog = new Set(catState.data.categories.flatMap((c) => c.recipes.map((r) => r.id)))
			const extra = [...known.values()].filter((r) => !inCatalog.has(r.id))
			if (extra.length) groups.push({ name: 'Hors catalogue', recipes: extra })
		}
		const effective = filter === 'missing' && !stats ? 'all' : filter
		const q = normalize(query)
		const rank = { known: 0, missing: 1, unknown: 2 }
		const shown = groups
			.map((g) => ({
				name: g.name,
				recipes: g.recipes
					.filter(
						(r) =>
							(!q || normalize(r.name).includes(q)) &&
							(effective === 'all' || statusOf(r.id) === effective),
					)
					.sort(
						(a, b) =>
							(sort === 'status' ? rank[statusOf(a.id)] - rank[statusOf(b.id)] : 0) ||
							collator.compare(a.name, b.name),
					),
			}))
			.filter((g) => g.recipes.length > 0)

		body = (
			<>
				<section aria-label='Extensions' className={styles.block}>
					<h2 className={styles.h2}>Extensions</h2>
					{prof.tiers.length > 0 ? (
						<ul className={styles.tiers}>
							{prof.tiers.map((t) => (
								<li key={t.id}>
									<button
										type='button'
										className={styles.tier}
										aria-pressed={t.id === tier?.id}
										onClick={() => setParam('tier', t.id)}
									>
										<span className={styles.tierHead}>
											<span>{t.expansion}</span>
											<span className={styles.dim}>
												{t.skill} / {t.max}
											</span>
										</span>
										<ProgressBar skill={t.skill} max={t.max} />
									</button>
								</li>
							))}
						</ul>
					) : sk ? (
						<div className={styles.tierStatic}>
							<span className={styles.tierHead}>
								<span>Niveau de compétence</span>
								<span className={styles.dim}>
									{sk.skill} / {sk.max}
								</span>
							</span>
							<ProgressBar skill={sk.skill} max={sk.max} />
							<p className={styles.dim}>Blizzard ne fournit ni découvertes ni projets via l’API.</p>
						</div>
					) : (
						<p className={styles.dim}>{NOT_PROVIDED}</p>
					)}
				</section>

				{prof.hasRecipes && tier && (
					<section aria-label='Recettes' className={styles.block}>
						<h2 className={styles.h2}>Recettes · {tier.expansion}</h2>
						{!char.professionsKnown && (
							<p className={styles.dim}>
								Blizzard n’a pas répondu pour ce personnage : statut des recettes inconnu.
							</p>
						)}
						{stats && (
							<div className={styles.stats}>
								<span>
									{stats.learned} apprises · {stats.missing} manquantes sur {stats.total} ({stats.pct}{' '}
									%)
								</span>
								<ProgressBar skill={stats.learned} max={stats.total} />
							</div>
						)}
						{catFailed && (
							<div className={styles.dim}>
								Impossible de charger le catalogue.{' '}
								<button
									type='button'
									className={styles.link}
									onClick={() => {
										setCatalog(null)
										setAttempt((a) => a + 1)
									}}
								>
									Réessayer
								</button>
							</div>
						)}
						{catLoading ? (
							<div className={styles.state}>Chargement…</div>
						) : (
							<>
								<div className={styles.controls}>
									<fieldset aria-label='Filtrer les recettes' className={styles.filters}>
										{FILTERS.map(([value, label]) => (
											<button
												key={value}
												type='button'
												className={styles.filter}
												aria-pressed={effective === value}
												disabled={value === 'missing' && !stats}
												onClick={() => setFilter(value)}
											>
												{label}
											</button>
										))}
									</fieldset>
									<Input
										type='search'
										aria-label='Rechercher une recette'
										placeholder='Rechercher une recette'
										value={query}
										onChange={(e) => setQuery(e.target.value)}
									/>
									<label className={styles.sort}>
										<span>Tri</span>
										<select
											value={sort}
											onChange={(e) => setSort(e.target.value as 'name' | 'status')}
										>
											<option value='name'>Nom</option>
											<option value='status'>Statut</option>
										</select>
									</label>
								</div>
								{shown.length === 0 ? (
									<div className={styles.state}>Aucune recette à afficher.</div>
								) : (
									shown.map((g) => (
										<div key={g.name} className={styles.group}>
											<h3 className={styles.groupTitle}>{g.name}</h3>
											<ul className={styles.recipes}>
												{g.recipes.map((r) => (
													<li key={r.id}>
														<button
															type='button'
															className={styles.recipe}
															data-recipe={r.id}
															aria-pressed={r.id === recipeId}
															onClick={() => setParam('recette', r.id)}
														>
															<ProfIcon src={iconUrl(r.id)} name={r.name} />
															<span className={styles.recipeName}>{r.name}</span>
															<Status status={statusOf(r.id)} />
														</button>
													</li>
												))}
											</ul>
										</div>
									))
								)}
							</>
						)}
					</section>
				)}

				{recipeId !== undefined && tier && (
					<RecipePanel
						key={recipeId}
						id={recipeId}
						profession={prof.name}
						expansion={tier.expansion}
						status={statusOf(recipeId)}
						onClose={closePanel}
					/>
				)}
			</>
		)
	}

	return (
		<main className={styles.main}>
			<Link className={styles.back} href='/metiers'>
				← Retour aux métiers
			</Link>
			{char && prof && (
				<div className={styles.titleRow}>
					<ProfIcon src={prof.icon} name={prof.name} size={48} />
					<div className={styles.titles}>
						<h1 className={styles.h1}>{prof.name}</h1>
						<span className={styles.sub}>
							{char.name} · {prof.kind === 'primary' ? 'Métier principal' : 'Métier secondaire'}
						</span>
					</div>
				</div>
			)}
			{body}
		</main>
	)
}

export default function ProfessionDetailPage() {
	return (
		<div className={styles.page}>
			<Header active='compte' />
			<Suspense fallback={<div className={styles.state}>Chargement…</div>}>
				<Detail />
			</Suspense>
		</div>
	)
}
