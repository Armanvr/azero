'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Header from '@/components/layout/Header'

export default function HomePage() {
	const router = useRouter()
	const [name, setName] = useState('')
	const [realm, setRealm] = useState('')

	function handleSearch(e: React.FormEvent) {
		e.preventDefault()
		const n = name.trim().toLowerCase()
		const r = realm.trim().toLowerCase().replace(/\s+/g, '-')
		if (!n || !r) return
		router.push(`/personnage/${encodeURIComponent(r)}/${encodeURIComponent(n)}`)
	}

	const inputStyle: React.CSSProperties = {
		width: '100%',
		padding: '10px 14px',
		background: 'var(--surface2)',
		border: '1px solid var(--border)',
		borderRadius: 6,
		color: 'var(--text)',
		fontSize: 13,
		fontFamily: "'Exo 2', sans-serif",
		outline: 'none',
		boxSizing: 'border-box',
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
			<Header active='home' />
			<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div style={{ width: 380, padding: '0 20px' }}>
					<div
						style={{
							fontFamily: 'Rajdhani',
							fontSize: 26,
							fontWeight: 700,
							color: 'var(--gold-light)',
							letterSpacing: 1,
							marginBottom: 6,
						}}
					>
						Rechercher un personnage
					</div>
					<div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
						Explorez la fiche de n'importe quel personnage WoW sans connexion.
					</div>
					<form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<input
							type='text'
							placeholder='Nom du personnage'
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							style={inputStyle}
						/>
						<input
							type='text'
							placeholder='Royaume (ex: kirin-tor, hyjal…)'
							value={realm}
							onChange={(e) => setRealm(e.target.value)}
							required
							style={inputStyle}
						/>
						<button
							type='submit'
							style={{
								padding: '10px 0',
								background: 'var(--gold-dim)',
								border: '1px solid rgba(201,150,12,0.5)',
								borderRadius: 6,
								color: 'var(--gold-light)',
								fontSize: 13,
								fontWeight: 600,
								fontFamily: "'Exo 2', sans-serif",
								letterSpacing: '0.5px',
								cursor: 'pointer',
								transition: 'all 0.15s',
							}}
						>
							Rechercher
						</button>
					</form>
					<div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
						Région EU uniquement. Le nom du royaume doit être en slug (minuscules, tirets).
					</div>
				</div>
			</div>
		</div>
	)
}
