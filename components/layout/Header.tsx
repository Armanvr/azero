'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Character } from '@/lib/types'

export type Page = 'home' | 'metiers' | 'profil' | 'personnage'

interface NavItem {
	label: string
	page: Page
	href: string
}

const NAV: NavItem[] = [
	{ label: 'ACCUEIL', page: 'home', href: '/' },
	{ label: 'MÉTIERS', page: 'metiers', href: '/metiers' },
	{ label: 'PROFIL', page: 'profil', href: '/profil' },
]

function charToHref(char: Character): string {
	const dashIdx = char.id.indexOf('-')
	const name = char.id.slice(0, dashIdx)
	const realm = char.id.slice(dashIdx + 1)
	return `/personnage/${realm}/${name}`
}

const navBtnStyle = (isActive: boolean): React.CSSProperties => ({
	padding: '5px 10px',
	background: isActive ? 'var(--gold-dim)' : 'transparent',
	border: isActive ? '1px solid rgba(201,150,12,0.4)' : '1px solid transparent',
	borderRadius: 4,
	color: isActive ? 'var(--gold-light)' : 'var(--text-dim)',
	fontSize: 11,
	fontWeight: 600,
	letterSpacing: '0.5px',
	cursor: 'pointer',
	fontFamily: "'Exo 2', sans-serif",
	transition: 'all 0.15s',
})

function navHover(e: React.MouseEvent<HTMLButtonElement>, isActive: boolean, enter: boolean) {
	if (!isActive) {
		e.currentTarget.style.color = enter ? 'var(--text)' : 'var(--text-dim)'
		e.currentTarget.style.borderColor = enter ? 'var(--border2)' : 'transparent'
	}
}

export default function Header({ active }: { active: Page }) {
	const router = useRouter()
	const dropdownRef = useRef<HTMLDivElement>(null)

	const [chars, setChars] = useState<Character[]>([])
	const [favoriteId, setFavoriteId] = useState<string | null>(null)
	const [subFavIds, setSubFavIds] = useState<Set<string>>(new Set())
	const [isOpen, setIsOpen] = useState(false)

	// Load characters + favorite info from profile
	useEffect(() => {
		Promise.all([
			fetch('/api/characters').then((r) => (r.ok ? r.json() : null)),
			fetch('/api/profile').then((r) => (r.ok ? r.json() : null)),
		])
			.then(([charRes, profileRes]) => {
				if (charRes?.characters) setChars(charRes.characters as Character[])
				if (profileRes?.user) {
					setFavoriteId(profileRes.user.favoriteCharId ?? null)
					setSubFavIds(new Set(profileRes.user.subFavoriteCharIds ?? []))
				}
			})
			.catch(() => {})
	}, [])

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsOpen(false)
			}
		}
		if (isOpen) document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [isOpen])

	// Compute which characters to show in dropdown (favorites + sub-favorites, sorted)
	const favoriteChars = chars.filter((c) => c.id === favoriteId)
	const subFavChars = chars.filter((c) => subFavIds.has(c.id))
	const dropdownChars = [...favoriteChars, ...subFavChars]

	// Fallback: if no favorites configured, show first character
	const fallbackChar = chars.length > 0 ? chars[0] : null
	const showButton = chars.length > 0

	return (
		<header
			style={{
				background: 'var(--surface)',
				borderBottom: '1px solid var(--border)',
				padding: '0 20px',
				height: 52,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				flexShrink: 0,
				zIndex: 10,
			}}
		>
			{/* Left nav */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
				<span
					style={{
						fontSize: 18,
						fontFamily: 'Rajdhani',
						fontWeight: 700,
						letterSpacing: 3,
						color: 'var(--gold-light)',
					}}
				>
					AZERO
				</span>
				<span style={{ width: 1, height: 20, background: 'var(--border2)' }} />
				<nav style={{ display: 'flex', gap: 2 }}>
					{NAV.map((n) => {
						const isActive = n.page === active
						return (
							<button
								type='button'
								key={n.label}
								onClick={() => router.push(n.href)}
								style={navBtnStyle(isActive)}
								onMouseEnter={(e) => navHover(e, isActive, true)}
								onMouseLeave={(e) => navHover(e, isActive, false)}
							>
								{n.label}
							</button>
						)
					})}
				</nav>
			</div>

			{/* Right section */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
				{showButton && (
					<div ref={dropdownRef} style={{ position: 'relative' }}>
						{dropdownChars.length > 0 ? (
							/* Dropdown trigger */
							<button
								type='button'
								onClick={() => setIsOpen((o) => !o)}
								style={navBtnStyle(active === 'personnage')}
								onMouseEnter={(e) => navHover(e, active === 'personnage', true)}
								onMouseLeave={(e) => navHover(e, active === 'personnage', false)}
							>
								PERSONNAGES {isOpen ? '▲' : '▼'}
							</button>
						) : (
							/* No favorites — direct link to first char */
							<button
								type='button'
								onClick={() => fallbackChar && router.push(charToHref(fallbackChar))}
								style={navBtnStyle(active === 'personnage')}
								onMouseEnter={(e) => navHover(e, active === 'personnage', true)}
								onMouseLeave={(e) => navHover(e, active === 'personnage', false)}
							>
								PERSONNAGES
							</button>
						)}

						{/* Dropdown panel */}
						{isOpen && dropdownChars.length > 0 && (
							<div
								style={{
									position: 'absolute',
									top: 'calc(100% + 6px)',
									right: 0,
									minWidth: 200,
									background: 'var(--surface)',
									border: '1px solid var(--border2)',
									borderRadius: 6,
									boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
									zIndex: 100,
									overflow: 'hidden',
								}}
							>
								{dropdownChars.map((char, idx) => {
									const isFav = char.id === favoriteId
									const href = charToHref(char)
									const isCurrentPage = active === 'personnage'
									return (
										<button
											key={char.id}
											type='button'
											onClick={() => {
												setIsOpen(false)
												router.push(href)
											}}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 8,
												width: '100%',
												padding: '9px 12px',
												background: 'transparent',
												border: 'none',
												borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
												cursor: 'pointer',
												textAlign: 'left',
												transition: 'background 0.1s',
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'var(--surface2)'
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'transparent'
											}}
										>
											<span
												style={{
													fontSize: 11,
													color: isFav ? 'var(--gold-light)' : '#a855f7',
													flexShrink: 0,
												}}
											>
												{isFav ? '★' : '☆'}
											</span>
											<div style={{ flex: 1, minWidth: 0 }}>
												<div
													style={{
														fontSize: 12,
														fontFamily: 'Rajdhani',
														fontWeight: 700,
														color: char.color,
														letterSpacing: 0.5,
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow: 'ellipsis',
													}}
												>
													{char.name}
												</div>
												<div
													style={{
														fontSize: 10,
														color: 'var(--text-muted)',
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow: 'ellipsis',
													}}
												>
													{char.spec ? `${char.spec} · ` : ''}
													{char.class} · {char.realm}
												</div>
											</div>
											{char.ilvl > 0 && (
												<span
													style={{
														fontSize: 10,
														color: 'var(--text-dim)',
														flexShrink: 0,
													}}
												>
													{char.ilvl}
												</span>
											)}
										</button>
									)
								})}
							</div>
						)}
					</div>
				)}

				{/* Avatar → profil */}
				<button
					type='button'
					onClick={() => router.push('/profil')}
					title='Profil'
					style={{
						width: 28,
						height: 28,
						borderRadius: '50%',
						background: 'var(--surface3)',
						border: '1px solid var(--border2)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						cursor: 'pointer',
					}}
				>
					<span style={{ fontSize: 12, color: 'var(--text-dim)' }}>👤</span>
				</button>
			</div>
		</header>
	)
}
