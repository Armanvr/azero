'use client'
import Link from 'next/link'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import { ProfIcon, ProgressBar } from '@/components/professions/ProfessionBits'
import Input from '@/components/ui/Input'
import { characterPath } from '@/lib/characterPath'
import { detailPath, normalize, pickTier, searchRecipes, skillOf } from '@/lib/professions'
import type { CharacterProfession, ProfessionCharacter } from '@/lib/types'
import { useProfessionCharacters } from '@/lib/useProfessionCharacters'
import styles from './page.module.css'

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`
const MAX_RESULTS = 100 // shortcut: no pagination, narrow the query instead; upgrade to "show more" if needed

function ProfCard({ char, p, expansion }: { char: ProfessionCharacter; p: CharacterProfession; expansion: string }) {
	const tier = pickTier(p, expansion)
	const sk = skillOf(p, tier)
	return (
		<Link className={styles.prof} href={detailPath(char.id, p.id, tier?.id)}>
			<div className={styles.profHead}>
				<ProfIcon src={p.icon} name={p.name} />
				<span className={styles.profText}>
					<span className={styles.profName}>{p.name}</span>
					{tier && <span className={styles.profSub}>{tier.expansion}</span>}
				</span>
				{sk && (
					<span className={styles.profSkill}>
						{sk.skill} / {sk.max}
					</span>
				)}
			</div>
			{sk && <ProgressBar skill={sk.skill} max={sk.max} />}
		</Link>
	)
}

function ProfColumn({
	title,
	char,
	profs,
	expansion,
}: {
	title: string
	char: ProfessionCharacter
	profs: CharacterProfession[]
	expansion: string
}) {
	return (
		<div className={styles.col}>
			<h3 className={styles.colTitle}>{title}</h3>
			{profs.length === 0 ? (
				<span className={styles.none}>—</span>
			) : (
				<ul className={styles.list}>
					{profs.map((p) => (
						<li key={p.id}>
							<ProfCard char={char} p={p} expansion={expansion} />
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

export default function MetiersPage() {
	const { characters, error, load } = useProfessionCharacters()
	const [charFilter, setCharFilter] = useState('')
	const [profFilter, setProfFilter] = useState('')
	const [expansion, setExpansion] = useState('')
	const [query, setQuery] = useState('')

	const profNames = [...new Set((characters ?? []).flatMap((c) => c.professions.map((p) => p.name)))].sort()
	const expansions = new Map<string, number>()
	for (const c of characters ?? [])
		for (const p of c.professions) for (const t of p.tiers) expansions.set(t.expansion, t.expansionOrder)
	const expansionList = [...expansions].sort((a, b) => b[1] - a[1]).map(([name]) => name)

	const visible = (characters ?? [])
		.filter((c) => !charFilter || c.id === charFilter)
		.map((c) => ({
			char: c,
			profs: c.professions.filter(
				(p) => (!profFilter || p.name === profFilter) && (!expansion || pickTier(p, expansion)),
			),
		}))
		// Without a profession filter every character stays, so one Blizzard did not answer for shows its warning
		.filter((v) => v.profs.length > 0 || (!profFilter && !expansion))

	const results = characters ? searchRecipes(characters, query) : []
	const searching = normalize(query).length >= 2 // same threshold as searchRecipes

	let body: React.ReactNode
	if (error) {
		body = (
			<div className={styles.state} aria-live='polite'>
				<p>Impossible de charger les métiers.</p>
				<button type='button' className={styles.retry} onClick={load}>
					Réessayer
				</button>
			</div>
		)
	} else if (!characters) {
		body = (
			<div className={styles.state} aria-live='polite'>
				Chargement…
			</div>
		)
	} else if (characters.length === 0) {
		body = (
			<div className={styles.state} aria-live='polite'>
				<p>Aucun personnage : liez un compte Battle.net pour afficher vos métiers.</p>
				<Link href='/profil'>Lier mon compte Battle.net</Link>
			</div>
		)
	} else if (searching) {
		body =
			results.length === 0 ? (
				<div className={styles.state} aria-live='polite'>
					Aucune recette apprise ne correspond à « {query.trim()} ».
				</div>
			) : (
				<ul className={styles.results} aria-label='Résultats de recherche'>
					{results.slice(0, MAX_RESULTS).map(({ recipe, hits }) => (
						<li key={recipe.id} className={styles.result}>
							<span className={styles.resultName}>{recipe.name}</span>
							<ul className={styles.hits}>
								{hits.map((h) => (
									<li key={`${h.char.id}-${h.profession.id}-${h.tier.id}`}>
										<Link href={detailPath(h.char.id, h.profession.id, h.tier.id, recipe.id)}>
											{h.char.name} · {h.profession.name} · {h.tier.expansion}
										</Link>
									</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			)
	} else if (visible.length === 0) {
		body = (
			<div className={styles.state} aria-live='polite'>
				Aucun métier ne correspond aux filtres.
			</div>
		)
	} else {
		body = (
			<div className={styles.chars}>
				{visible.map(({ char: c, profs }) => (
					<section key={c.id} className={styles.char} aria-label={c.name}>
						<div className={styles.who}>
							<div className={styles.avatar} aria-hidden='true'>
								{c.name[0]}
							</div>
							<div className={styles.whoText}>
								<span className={styles.charName}>{c.name}</span>
								<span className={styles.charClass}>
									{c.class} · {c.spec} · niv. {c.level}
								</span>
							</div>
							<Link
								className={styles.more}
								href={characterPath(c.name, c.realmSlug)}
								aria-label={`Voir la page de ${c.name}`}
							>
								···
							</Link>
						</div>
						{!c.professionsKnown && (
							<p className={styles.warn}>
								Blizzard n’a pas répondu pour ce personnage : recettes indisponibles.
							</p>
						)}
						<div className={styles.cols}>
							<ProfColumn
								title='PRINCIPAUX'
								char={c}
								profs={profs.filter((p) => p.kind === 'primary')}
								expansion={expansion}
							/>
							<ProfColumn
								title='SECONDAIRES'
								char={c}
								profs={profs.filter((p) => p.kind === 'secondary')}
								expansion={expansion}
							/>
						</div>
					</section>
				))}
			</div>
		)
	}

	return (
		<div className={styles.page}>
			<Header active='compte' />
			<main className={styles.main}>
				<div className={styles.titles}>
					<h1 className={styles.h1}>Métiers du compte</h1>
					{characters && <span className={styles.sub}>{plural(characters.length, 'personnage')}</span>}
				</div>

				{characters && characters.length > 0 && (
					<div className={styles.filters}>
						<Input
							label='Rechercher une recette apprise'
							type='search'
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder='Ex. : élixir, flèche…'
						/>
						<label className={styles.select}>
							<span>Personnage</span>
							<select
								value={charFilter}
								onChange={(e) => setCharFilter(e.target.value)}
								disabled={searching}
							>
								<option value=''>Tous</option>
								{characters.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</label>
						<label className={styles.select}>
							<span>Métier</span>
							<select
								value={profFilter}
								onChange={(e) => setProfFilter(e.target.value)}
								disabled={searching}
							>
								<option value=''>Tous</option>
								{profNames.map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						</label>
						<label className={styles.select}>
							<span>Extension</span>
							<select
								value={expansion}
								onChange={(e) => setExpansion(e.target.value)}
								disabled={searching}
							>
								<option value=''>La plus récente</option>
								{expansionList.map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						</label>
					</div>
				)}
				{body}
			</main>
		</div>
	)
}
