'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { characterPath, realmSlug } from '@/lib/characterPath'
import styles from './Header.module.css'

type Active = 'personnages' | 'compte' | 'planning'

const NAV: { label: string; id: Active; href: string }[] = [
	{ label: 'Personnages', id: 'personnages', href: '/' },
	{ label: 'Compte', id: 'compte', href: '/metiers' },
	{ label: 'Planning', id: 'planning', href: '/planning' },
]

// `Nom-Royaume`, `Nom Royaume` or `Nom@Royaume` (realm may hold spaces) -> character page href
function parseSearch(value: string): string | null {
	const m = value.trim().match(/^([^\s@-]+)[\s@-]+(.+)$/)
	if (!m) return null
	if (!realmSlug(m[2])) return null
	return characterPath(m[1], m[2])
}

export default function Header({ active }: { active?: Active }) {
	const router = useRouter()
	const inputRef = useRef<HTMLInputElement>(null)
	const [query, setQuery] = useState('')
	const [hint, setHint] = useState(false)
	// undefined = loading, null = logged out
	const [initial, setInitial] = useState<string | null | undefined>(undefined)

	useEffect(() => {
		fetch('/api/profile')
			.then((r) => (r.ok ? r.json() : null))
			.then((j) => setInitial(j?.user?.username?.[0]?.toUpperCase() ?? null))
			.catch(() => setInitial(null))
	}, [])

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
			const t = e.target as HTMLElement
			if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
			e.preventDefault()
			inputRef.current?.focus()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [])

	function submit(e: React.FormEvent) {
		e.preventDefault()
		const href = parseSearch(query)
		setHint(!href)
		if (href) {
			setQuery('')
			inputRef.current?.blur()
			router.push(href)
		}
	}

	return (
		<header className={styles.header}>
			<Link href='/' className={styles.logo}>
				<span className={styles.diamond} />
				<span className={styles.logoText}>ARMURERIE</span>
			</Link>
			<nav className={styles.nav}>
				{NAV.map((n) => (
					<Link
						key={n.id}
						href={n.href}
						className={styles.navLink}
						aria-current={n.id === active ? 'page' : undefined}
					>
						{n.label}
					</Link>
				))}
			</nav>
			<div className={styles.spacer} />
			{/* biome-ignore lint/a11y/useSemanticElements: <search> would need a wrapper around the styled form */}
			<form className={styles.search} role='search' onSubmit={submit}>
				<svg
					width='14'
					height='14'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='2'
					aria-hidden='true'
				>
					<circle cx='11' cy='11' r='7' />
					<path d='m20 20-3.5-3.5' />
				</svg>
				<input
					ref={inputRef}
					className={styles.searchInput}
					type='text'
					aria-label='Rechercher un personnage'
					placeholder='Rechercher un personnage'
					autoComplete='off'
					aria-invalid={hint}
					spellCheck={false}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value)
						setHint(false)
					}}
				/>
				<span className={styles.kbd} aria-hidden='true'>
					/
				</span>
				{/* live region stays mounted so screen readers announce the text when it appears */}
				<span role='status' className={styles.hint}>
					{hint && 'Format : Nom-Royaume'}
				</span>
			</form>
			<svg
				className={styles.bell}
				width='18'
				height='18'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='1.6'
				aria-hidden='true'
			>
				<path d='M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9' />
				<path d='M10.3 21a1.94 1.94 0 0 0 3.4 0' />
			</svg>
			{initial === null ? (
				<Link href='/auth' className={styles.login}>
					Connexion
				</Link>
			) : initial === undefined ? (
				<span className={styles.avatarPlaceholder} aria-hidden='true' />
			) : (
				<Link href='/profil' className={styles.avatar} aria-label='Profil'>
					{initial}
				</Link>
			)}
		</header>
	)
}
