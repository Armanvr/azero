'use client'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import CharacterCard from '@/components/profile/CharacterCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import RecoveryCode from '@/components/ui/RecoveryCode'
import { charId as makeCharId } from '@/lib/characterPath'
import type { BnetCharacter } from '@/lib/types'
import styles from './page.module.css'

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
	const [loadError, setLoadError] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)
	const [disconnecting, setDisconnecting] = useState(false)
	const [password, setPassword] = useState('')
	const [generating, setGenerating] = useState(false)
	const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
	const [recoveryError, setRecoveryError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)

	const load = useCallback(async () => {
		setLoadError(false)
		setData(null)
		try {
			const res = await fetch('/api/profile')
			if (res.status === 401) return router.replace('/auth')
			if (!res.ok) throw new Error()
			setData((await res.json()) as ProfileData)
		} catch {
			setLoadError(true)
		}
	}, [router])

	useEffect(() => {
		load()
	}, [load])

	async function disconnect() {
		setDisconnecting(true)
		setActionError(null)
		try {
			const res = await fetch('/api/auth/bnet/disconnect', { method: 'POST' })
			if (!res.ok) throw new Error()
			const profile = await fetch('/api/profile')
			if (profile.ok) setData((await profile.json()) as ProfileData)
		} catch {
			setActionError('Déconnexion impossible. Réessayez.')
		} finally {
			setDisconnecting(false)
		}
	}

	// Updates the UI only once the server has accepted the change
	async function saveFavorites(body: { favoriteCharId?: string | null; subFavoriteCharIds: string[] }) {
		setSaving(true)
		setActionError(null)
		try {
			const res = await fetch('/api/profile/favorites', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			if (!res.ok) throw new Error()
			setData((prev) => (prev ? { ...prev, user: { ...prev.user, ...body } } : prev))
		} catch {
			setActionError('Impossible d’enregistrer vos favoris. Réessayez.')
		} finally {
			setSaving(false)
		}
	}

	async function generateRecoveryCode(e: FormEvent) {
		e.preventDefault()
		setGenerating(true)
		setRecoveryError(null)
		setRecoveryCode(null)
		try {
			const res = await fetch('/api/profile/recovery-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
			})
			const json = await res.json().catch(() => ({}))
			if (res.ok && json.recoveryCode) {
				setRecoveryCode(json.recoveryCode)
				setPassword('')
			} else {
				setRecoveryError(json.error ?? 'Erreur lors de la génération du code.')
			}
		} catch {
			setRecoveryError('Erreur réseau')
		} finally {
			setGenerating(false)
		}
	}

	function handleFavoriteToggle(charId: string) {
		if (!data) return
		const favoriteCharId = data.user.favoriteCharId === charId ? null : charId
		// A main character cannot also be a sub-favourite
		const subFavoriteCharIds = (data.user.subFavoriteCharIds ?? []).filter((id) => id !== favoriteCharId)
		return saveFavorites({ favoriteCharId, subFavoriteCharIds })
	}

	function handleSubFavoriteToggle(charId: string) {
		if (!data) return
		const current = data.user.subFavoriteCharIds ?? []
		return saveFavorites({
			subFavoriteCharIds: current.includes(charId) ? current.filter((id) => id !== charId) : [...current, charId],
		})
	}

	const user = data?.user
	const characters = data?.characters ?? []

	return (
		<>
			<Header />
			{!user ? (
				<main className={styles.loading}>
					{loadError ? (
						<div className={styles.state}>
							<p>Impossible de charger le profil.</p>
							<button type='button' className={styles.retry} onClick={load}>
								Réessayer
							</button>
						</div>
					) : (
						'Chargement…'
					)}
				</main>
			) : (
				<main className={styles.content}>
					{/* User info */}
					<div className={styles.user}>
						<div className={styles.avatar}>{user.username[0]?.toUpperCase()}</div>
						<div>
							<div className={styles.username}>{user.username}</div>
							<div className={styles.email}>{user.email}</div>
							<div className={styles.since}>
								Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR')}
							</div>
						</div>
					</div>

					{/* Battle.net section */}
					<div className={styles.card}>
						<h2 className={styles.label}>BATTLE.NET</h2>
						{user.bnetConnected ? (
							<div className={styles.bnetRow}>
								<span className={styles.connected}>Compte connecté</span>
								<Button
									className={`${styles.compact} ${styles.secondary}`}
									loading={disconnecting}
									onClick={disconnect}
								>
									DÉCONNECTER
								</Button>
							</div>
						) : (
							<div className={styles.bnetRow}>
								<span className={styles.hint}>
									Connectez votre compte pour importer vos personnages.
								</span>
								<Button
									className={styles.compact}
									onClick={() => window.location.assign('/api/auth/bnet')}
								>
									CONNECTER BATTLE.NET
								</Button>
							</div>
						)}
					</div>

					{/* Recovery code */}
					<div className={styles.card}>
						<h2 className={styles.label}>CODE DE RÉCUPÉRATION</h2>
						<p className={styles.recoveryText}>
							Ce code vous permet de réinitialiser un mot de passe oublié depuis l&apos;écran de
							connexion. Il n&apos;est affiché qu&apos;une seule fois : conservez-le en lieu sûr. Générer
							un nouveau code invalide le précédent.
						</p>
						<form className={styles.recoveryForm} onSubmit={generateRecoveryCode}>
							<Input
								id='recovery-password'
								label='Mot de passe actuel'
								type='password'
								autoComplete='current-password'
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<Button type='submit' loading={generating}>
								Générer un nouveau code
							</Button>
						</form>
						{recoveryError && (
							<div role='alert' className={styles.error}>
								{recoveryError}
							</div>
						)}
						{recoveryCode && (
							<>
								<div className={styles.codeBox}>
									<RecoveryCode code={recoveryCode} />
								</div>
								<div className={styles.codeHint}>Notez-le maintenant : il ne sera plus affiché.</div>
							</>
						)}
					</div>

					{actionError && (
						<div role='alert' className={styles.error}>
							{actionError}
						</div>
					)}

					{/* Characters */}
					{user.bnetConnected &&
						(() => {
							if (characters.length === 0) {
								return <div className={styles.empty}>Aucun personnage trouvé.</div>
							}

							const getCharId = (c: (typeof characters)[0]) => makeCharId(c.name, c.realmSlug)
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
										saving={saving}
										onFavoriteToggle={handleFavoriteToggle}
										onSubFavoriteToggle={handleSubFavoriteToggle}
										onRefreshed={(updated) =>
											setData((prev) =>
												prev
													? {
															...prev,
															characters: prev.characters.map((c) =>
																c.name === updated.name &&
																c.realmSlug === updated.realmSlug
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
								<div className={styles.groups}>
									<div className={styles.legend}>★ = personnage principal · ☆ = sous-favori</div>

									{favoriteChar && (
										<div>
											<div className={styles.groupTitle} data-kind='main'>
												<span>★</span>
												<span>PERSONNAGE PRINCIPAL</span>
											</div>
											<div className={styles.box} data-kind='main'>
												<div className={styles.cards}>{renderCard(favoriteChar)}</div>
											</div>
										</div>
									)}

									{subFavChars.length > 0 && (
										<div>
											<div className={styles.groupTitle} data-kind='sub'>
												<span>☆</span>
												<span>SOUS-FAVORIS</span>
											</div>
											<div className={styles.box} data-kind='sub'>
												<div className={styles.cards}>{subFavChars.map(renderCard)}</div>
											</div>
										</div>
									)}

									{otherChars.length > 0 && (
										<div>
											<div className={styles.groupTitle}>PERSONNAGES ({otherChars.length})</div>
											<div className={styles.cards}>{otherChars.map(renderCard)}</div>
										</div>
									)}
								</div>
							)
						})()}
				</main>
			)}
		</>
	)
}
