'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { characterPath, realmSlug } from '@/lib/characterPath'
import type { Character } from '@/lib/types'
import styles from './page.module.css'

export default function HomePage() {
	const router = useRouter()
	const [name, setName] = useState('')
	const [realm, setRealm] = useState('')
	const [chars, setChars] = useState<Character[]>([])
	const [loadError, setLoadError] = useState(false)
	const [searchError, setSearchError] = useState(false)

	// Logged out (401): the list silently stays empty. The API already returns favourites first.
	useEffect(() => {
		fetch('/api/characters')
			.then((r) => {
				if (r.status === 401) return null
				if (!r.ok) throw new Error()
				return r.json()
			})
			.then((j) => j?.characters && setChars(j.characters as Character[]))
			.catch(() => setLoadError(true))
	}, [])

	function handleSearch(e: React.FormEvent) {
		e.preventDefault()
		const n = name.trim()
		const r = realm.trim()
		const valid = !!n && !!realmSlug(r)
		setSearchError(!valid)
		if (valid) router.push(characterPath(n, r))
	}

	return (
		<>
			<Header active='personnages' />
			<main className={styles.main}>
				<div className={styles.titleBlock}>
					<h1 className={styles.title}>Personnages</h1>
					<p className={styles.subtitle}>
						Consultez la fiche de n&apos;importe quel personnage, ou retrouvez les vôtres.
					</p>
				</div>

				<section className={styles.card}>
					<h2 className={styles.cardTitle}>
						<span className={styles.diamond} />
						RECHERCHER UN PERSONNAGE
					</h2>
					<form onSubmit={handleSearch} className={styles.form}>
						<Input
							type='text'
							className={styles.input}
							aria-label='Nom du personnage'
							placeholder='Nom du personnage'
							autoComplete='off'
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
						<Input
							type='text'
							className={styles.input}
							aria-label='Royaume'
							placeholder='Royaume (ex : Kirin Tor, Hyjal…)'
							autoComplete='off'
							value={realm}
							onChange={(e) => setRealm(e.target.value)}
							required
						/>
						<Button type='submit' className={styles.submit}>
							RECHERCHER
						</Button>
					</form>
					<p className={styles.hint} role={searchError ? 'alert' : undefined}>
						{searchError
							? 'Renseignez le nom du personnage et son royaume.'
							: 'Région EU uniquement. Saisissez le royaume tel qu’il s’affiche en jeu (ex : Chants éternels).'}
					</p>
				</section>

				{loadError && (
					<p role='alert' className={styles.hint}>
						Impossible de charger vos personnages.
					</p>
				)}

				{chars.length > 0 && (
					<section className={styles.list}>
						<div className={`${styles.row} ${styles.headRow}`}>
							<span>PERSONNAGE</span>
							<span>ILVL</span>
						</div>
						{chars.map((c) => {
							return (
								<Link
									key={c.id}
									href={characterPath(c.name, c.id.slice(c.id.indexOf('-') + 1))}
									className={`${styles.row} ${styles.charRow}`}
								>
									<span className={styles.who}>
										<span className={styles.avatar}>{c.name[0]}</span>
										<span className={styles.whoText}>
											<span className={styles.charName}>{c.name}</span>
											<span className={styles.charMeta}>
												{c.class}
												{c.spec ? ` · ${c.spec}` : ''}
											</span>
										</span>
									</span>
									<span className={styles.ilvl}>{c.ilvl > 0 ? c.ilvl : '—'}</span>
								</Link>
							)
						})}
					</section>
				)}
			</main>
		</>
	)
}
