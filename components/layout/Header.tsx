'use client'
import { useRouter } from 'next/navigation'

type Page = 'home' | 'metiers' | 'collections'

interface NavItem {
	label: string
	page: Page
	href: string
}

const NAV: NavItem[] = [
	{ label: 'ACCUEIL', page: 'home', href: '/' },
	{ label: 'MÉTIERS', page: 'metiers', href: '/metiers' },
	{ label: 'COLLECTIONS', page: 'collections', href: '/metiers' },
]

export default function Header({ active }: { active: Page }) {
	const router = useRouter()

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' })
		router.replace('/auth')
	}

	return (
		<header className="bg-surface border-b border-border px-5 h-[52px] flex items-center justify-between shrink-0 z-10">
			<div className="flex items-center gap-3">
				<span className="text-md font-rajdhani font-bold tracking-widest text-gold-light">
					AZERO
				</span>

				<span className="w-px h-5 bg-border2" />

				<nav className="flex gap-0.5">
					{NAV.map((n) => {
						const isActive = n.page === active
						return (
							<button
								type='button'
								key={n.label}
								onClick={() => router.push(n.href)}
								className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wide cursor-pointer font-exo transition-all duration-150
									${isActive
										? 'bg-gold-dim border border-[rgba(201,150,12,0.4)] text-gold-light'
										: 'bg-transparent border border-transparent text-text-dim hover:text-text hover:border-border2'
									}`}
							>
								{n.label}
							</button>
						)
					})}
				</nav>
			</div>
			<div className="flex items-center gap-[10px]">
				<button
					type='button'
					onClick={logout}
					title='Déconnexion'
					className="w-7 h-7 rounded-full bg-surface3 border border-border2 flex items-center justify-center cursor-pointer"
				>
					<span className="text-xs text-text-dim">👤</span>
				</button>
			</div>
		</header>
	)
}
