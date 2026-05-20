'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/layout/Header'

export default function MetiersPage() {
	const router = useRouter()

	useEffect(() => {
		fetch('/api/profile').then((r) => {
			if (r.status === 401) router.replace('/auth')
		})
	}, [router])

	return (
		<div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			<Header active='metiers' />

			<div
				style={{
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					gap: 20,
					animation: 'fadeIn 0.3s ease',
				}}
			>
				<div style={{ position: 'relative', marginBottom: 12 }}>
					<div
						style={{
							width: 80,
							height: 80,
							borderRadius: '50%',
							background: 'var(--surface2)',
							border: '2px solid var(--border2)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 32,
						}}
					>
						⚒️
					</div>
					<div
						style={{
							position: 'absolute',
							inset: -8,
							borderRadius: '50%',
							border: '1px dashed var(--border2)',
							animation: 'spin 12s linear infinite',
						}}
					/>
				</div>

				<div style={{ fontSize: 32, fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 3 }}>MÉTIERS</div>
				<div style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: 1 }}>COMING SOON</div>
				<div
					style={{
						width: 200,
						height: 1,
						background: 'linear-gradient(90deg,transparent,var(--border2),transparent)',
					}}
				/>
				<p
					style={{
						fontSize: 12,
						color: 'var(--text-muted)',
						maxWidth: 320,
						textAlign: 'center',
						lineHeight: 1.7,
					}}
				>
					La section Métiers est en cours de développement. Elle affichera la progression par personnage.
				</p>

				<button
					type='button'
					onClick={() => router.push('/')}
					style={{
						marginTop: 8,
						padding: '9px 20px',
						background: 'transparent',
						border: '1px solid var(--border2)',
						borderRadius: 4,
						color: 'var(--text-dim)',
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.5px',
						cursor: 'pointer',
						fontFamily: "'Exo 2', sans-serif",
						transition: 'all 0.15s',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.borderColor = 'var(--gold)'
						e.currentTarget.style.color = 'var(--gold-light)'
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.borderColor = 'var(--border2)'
						e.currentTarget.style.color = 'var(--text-dim)'
					}}
				>
					← RETOUR À L&apos;ACCUEIL
				</button>
			</div>
		</div>
	)
}
