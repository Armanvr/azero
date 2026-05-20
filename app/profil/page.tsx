'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import CharacterCard from '@/components/profile/CharacterCard'
import Button from '@/components/ui/Button'
import type { BnetCharacter } from '@/lib/types'

interface ProfileUser {
	id: string
	username: string
	email: string
	createdAt: string
	bnetConnected: boolean
	favoriteCharId: string | null
	subFavoriteCharIds: string[]
}

interface ProfileData {
	user: ProfileUser
	characters: BnetCharacter[]
}

export default function ProfilPage() {
	const router = useRouter()
	const [data, setData] = useState<ProfileData | null>(null)
	const [loading, setLoading] = useState(true)
	const [disconnecting, setDisconnecting] = useState(false)

	useEffect(() => {
		fetch('/api/profile')
			.then((r) => {
				if (r.status === 401) {
					router.replace('/auth')
					return null
				}
				return r.ok ? r.json() : null
			})
			.then((j) => j && setData(j as ProfileData))
			.finally(() => setLoading(false))
	}, [router])

	async function disconnect() {
		setDisconnecting(true)
		await fetch('/api/auth/bnet/disconnect', { method: 'POST' })
		const res = await fetch('/api/profile')
		if (res.ok) setData((await res.json()) as ProfileData)
		setDisconnecting(false)
	}

	async function handleFavoriteToggle(charId: string) {
		if (!data) return
		const newFavoriteId = data.user.favoriteCharId === charId ? null : charId
		// If setting as favorite, remove from sub-favorites
		const newSubs = (data.user.subFavoriteCharIds ?? []).filter((id) => id !== newFavoriteId)
		await fetch('/api/profile/favorites', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ favoriteCharId: newFavoriteId, subFavoriteCharIds: newSubs }),
		})
		setData((prev) =>
			prev
				? { ...prev, user: { ...prev.user, favoriteCharId: newFavoriteId, subFavoriteCharIds: newSubs } }
				: prev,
		)
	}

	async function handleSubFavoriteToggle(charId: string) {
		if (!data) return
		const current = data.user.subFavoriteCharIds ?? []
		const newSubs = current.includes(charId) ? current.filter((id) => id !== charId) : [...current, charId]
		await fetch('/api/profile/favorites', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ subFavoriteCharIds: newSubs }),
		})
		setData((prev) => (prev ? { ...prev, user: { ...prev.user, subFavoriteCharIds: newSubs } } : prev))
	}

	if (loading) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
				<Header active='profil' />
				<div
					style={{
						flex: 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'var(--text-muted)',
					}}
				>
					Chargement…
				</div>
			</div>
		)
	}

	if (!data) return null

	const { user, characters } = data
	const memberDate = new Date(user.createdAt).toLocaleDateString('fr-FR')

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
			<Header active='profil' />
			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '32px 24px',
					maxWidth: 720,
					margin: '0 auto',
					width: '100%',
				}}
			>
				{/* User info */}
				<div
					style={{
						background: 'var(--surface)',
						border: '1px solid var(--border)',
						borderRadius: 8,
						padding: '20px 24px',
						display: 'flex',
						alignItems: 'center',
						gap: 16,
						marginBottom: 16,
					}}
				>
					<div
						style={{
							width: 48,
							height: 48,
							borderRadius: '50%',
							background: 'var(--surface3)',
							border: '1px solid var(--border2)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 20,
							flexShrink: 0,
						}}
					>
						👤
					</div>
					<div>
						<div
							style={{
								fontSize: 16,
								fontFamily: 'Rajdhani',
								fontWeight: 700,
								color: 'var(--gold-light)',
								letterSpacing: 1,
							}}
						>
							{user.username}
						</div>
						<div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{user.email}</div>
						<div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
							Membre depuis {memberDate}
						</div>
					</div>
				</div>

				{/* Battle.net section */}
				<div
					style={{
						background: 'var(--surface)',
						border: '1px solid var(--border)',
						borderRadius: 8,
						padding: '20px 24px',
						marginBottom: 16,
					}}
				>
					<div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 12 }}>
						BATTLE.NET
					</div>
					{user.bnetConnected ? (
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<span style={{ color: '#22c55e', fontSize: 14 }}>●</span>
								<span style={{ fontSize: 13, color: 'var(--text)' }}>Compte connecté</span>
							</div>
							<Button loading={disconnecting} onClick={disconnect}>
								DÉCONNECTER
							</Button>
						</div>
					) : (
						<div
							style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
						>
							<span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
								Connectez votre compte pour importer vos personnages.
							</span>
							<Button onClick={() => router.push('/api/auth/bnet')}>CONNECTER BATTLE.NET</Button>
						</div>
					)}
				</div>

				{/* Characters */}
				{user.bnetConnected &&
					(() => {
						if (characters.length === 0) {
							return (
								<div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun personnage trouvé.</div>
							)
						}

						const getCharId = (c: (typeof characters)[0]) => `${c.name.toLowerCase()}-${c.realmSlug}`
						const subFavIds = new Set(user.subFavoriteCharIds ?? [])
						const favoriteChar = characters.find((c) => getCharId(c) === user.favoriteCharId)
						const subFavChars = characters.filter((c) => subFavIds.has(getCharId(c)))
						const otherChars = characters.filter((c) => {
							const id = getCharId(c)
							return id !== user.favoriteCharId && !subFavIds.has(id)
						})

						const renderCard = (char: (typeof characters)[0]) => {
							const charId = getCharId(char)
							return (
								<CharacterCard
									key={`${char.name}-${char.realmSlug}`}
									char={char}
									isFavorite={user.favoriteCharId === charId}
									isSubFavorite={subFavIds.has(charId)}
									onFavoriteToggle={handleFavoriteToggle}
									onSubFavoriteToggle={handleSubFavoriteToggle}
									onView={() =>
										router.push(`/personnage/${char.realmSlug}/${char.name.toLowerCase()}`)
									}
									onRefreshed={(updated) =>
										setData((prev) =>
											prev
												? {
														...prev,
														characters: prev.characters.map((c) =>
															c.name === updated.name && c.realmSlug === updated.realmSlug
																? updated
																: c,
														),
													}
												: prev,
										)
									}
								/>
							)
						}

						return (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
								{/* Hint */}
								<div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
									★ = personnage principal · ☆ = sous-favori
								</div>

								{/* Favorite section */}
								{favoriteChar && (
									<div>
										<div
											style={{
												fontSize: 11,
												color: 'var(--gold-light)',
												letterSpacing: 2,
												marginBottom: 10,
												display: 'flex',
												alignItems: 'center',
												gap: 6,
											}}
										>
											<span>★</span>
											<span>PERSONNAGE PRINCIPAL</span>
										</div>
										<div
											style={{
												background: 'rgba(240,180,41,0.04)',
												border: '1px solid rgba(240,180,41,0.2)',
												borderRadius: 8,
												padding: 12,
											}}
										>
											<div
												style={{
													display: 'grid',
													gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
													gap: 8,
												}}
											>
												{renderCard(favoriteChar)}
											</div>
										</div>
									</div>
								)}

								{/* Sub-favorites section */}
								{subFavChars.length > 0 && (
									<div>
										<div
											style={{
												fontSize: 11,
												color: '#a855f7',
												letterSpacing: 2,
												marginBottom: 10,
												display: 'flex',
												alignItems: 'center',
												gap: 6,
											}}
										>
											<span>☆</span>
											<span>SOUS-FAVORIS</span>
										</div>
										<div
											style={{
												background: 'rgba(168,85,247,0.04)',
												border: '1px solid rgba(168,85,247,0.15)',
												borderRadius: 8,
												padding: 12,
											}}
										>
											<div
												style={{
													display: 'grid',
													gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
													gap: 8,
												}}
											>
												{subFavChars.map(renderCard)}
											</div>
										</div>
									</div>
								)}

								{/* Other characters */}
								{otherChars.length > 0 && (
									<div>
										<div
											style={{
												fontSize: 11,
												color: 'var(--text-muted)',
												letterSpacing: 2,
												marginBottom: 10,
											}}
										>
											PERSONNAGES ({otherChars.length})
										</div>
										<div
											style={{
												display: 'grid',
												gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
												gap: 8,
											}}
										>
											{otherChars.map(renderCard)}
										</div>
									</div>
								)}
							</div>
						)
					})()}
			</div>
		</div>
	)
}
