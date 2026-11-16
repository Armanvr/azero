'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import RecoveryCode from '@/components/ui/RecoveryCode'
import styles from './page.module.css'

type Mode = 'login' | 'register' | 'reset' | 'recovery'

const EMPTY_FORM = { email: '', password: '', username: '', recoveryCode: '' }

const COPY = {
	login: { title: 'Bon retour, aventurier', sub: 'Connectez-vous pour retrouver vos héros.' },
	register: { title: 'Rejoignez la chronique', sub: 'Créez votre compte en quelques secondes.' },
	reset: {
		title: 'Mot de passe oublié',
		sub: 'Saisissez votre e-mail, votre code de récupération et un nouveau mot de passe.',
	},
	recovery: { title: 'Votre code de récupération', sub: '' },
}

export default function AuthPage() {
	const router = useRouter()
	const [mode, setMode] = useState<Mode>('login')
	const [form, setForm] = useState(EMPTY_FORM)
	const [remember, setRemember] = useState(true)
	const [showPwd, setShowPwd] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [issuedCode, setIssuedCode] = useState('')

	const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
		setForm((p) => ({ ...p, [key]: e.target.value }))

	function goTo(next: Mode) {
		setMode(next)
		setForm(EMPTY_FORM)
		setShowPwd(false)
		setError('')
	}

	async function submit(e: React.FormEvent) {
		e.preventDefault()
		setError('')
		setLoading(true)
		const body =
			mode === 'reset'
				? { email: form.email, recoveryCode: form.recoveryCode, password: form.password }
				: mode === 'register'
					? { email: form.email, username: form.username, password: form.password }
					: { email: form.email, password: form.password, remember }
		try {
			const res = await fetch(`/api/auth/${mode}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			const json = await res.json()
			if (!res.ok) {
				setError(json.error || "Erreur d'authentification.")
				setLoading(false)
				return
			}
			if (json.recoveryCode) {
				// the code is only returned once: show it before leaving the page
				setIssuedCode(json.recoveryCode)
				setLoading(false)
				goTo('recovery')
				return
			}
			done()
		} catch {
			setError('Impossible de contacter le serveur.')
			setLoading(false)
		}
	}

	function done() {
		router.replace('/')
		router.refresh()
	}

	const errorBox = error && (
		<div role='alert' className={styles.error}>
			{error}
		</div>
	)

	const toggle = (
		<button type='button' className={styles.toggle} onClick={() => setShowPwd((s) => !s)}>
			{showPwd ? 'Masquer' : 'Afficher'}
		</button>
	)
	const pwdType = showPwd ? 'text' : 'password'
	const isTabs = mode === 'login' || mode === 'register'
	const { title, sub } = COPY[mode]

	return (
		<div className={styles.page}>
			<div className={styles.art}>
				<div className={styles.tagline}>
					<span className={styles.kicker}>ARMURERIE DE COMPTE</span>
					<span className={styles.slogan}>Tous vos héros, une seule chronique.</span>
				</div>
			</div>

			<main className={styles.panel}>
				<div className={styles.box}>
					<div className={styles.head}>
						<span className={styles.diamond} />
						<h1 className={styles.title}>{title}</h1>
						{sub && <p className={styles.sub}>{sub}</p>}
					</div>

					{isTabs && (
						<div className={styles.tabs}>
							<button
								type='button'
								className={styles.tab}
								disabled={loading}
								data-active={mode === 'login' || undefined}
								onClick={() => goTo('login')}
							>
								CONNEXION
							</button>
							<button
								type='button'
								className={styles.tab}
								disabled={loading}
								data-active={mode === 'register' || undefined}
								onClick={() => goTo('register')}
							>
								INSCRIPTION
							</button>
						</div>
					)}

					{mode === 'recovery' ? (
						<div className={styles.form}>
							<RecoveryCode code={issuedCode} />
							<p className={styles.warning}>
								Ce code n&apos;est affiché qu&apos;une seule fois. C&apos;est le seul moyen de récupérer
								votre compte si vous oubliez votre mot de passe : conservez-le en lieu sûr. Il remplace
								votre code précédent après une réinitialisation.
							</p>
							<Button type='button' onClick={done}>
								J&apos;AI NOTÉ MON CODE
							</Button>
						</div>
					) : mode === 'reset' ? (
						<form onSubmit={submit} className={styles.form}>
							<Input
								label='E-mail'
								type='email'
								placeholder='vous@exemple.fr'
								autoComplete='email'
								value={form.email}
								onChange={update('email')}
								required
							/>
							<Input
								label='Code de récupération'
								placeholder='XXXX-XXXX-XXXX-XXXX'
								autoComplete='off'
								spellCheck={false}
								value={form.recoveryCode}
								onChange={update('recoveryCode')}
								required
							/>
							<Input
								label='Nouveau mot de passe'
								type={pwdType}
								placeholder='••••••••'
								autoComplete='new-password'
								value={form.password}
								onChange={update('password')}
								action={toggle}
								required
							/>
							{errorBox}
							<Button type='submit' loading={loading}>
								RÉINITIALISER
							</Button>
							<button
								type='button'
								className={styles.link}
								disabled={loading}
								onClick={() => goTo('login')}
							>
								← Retour à la connexion
							</button>
						</form>
					) : (
						<>
							<form onSubmit={submit} className={styles.form}>
								{mode === 'register' && (
									<Input
										label="Nom d'aventurier"
										placeholder='Aldric'
										autoComplete='nickname'
										value={form.username}
										onChange={update('username')}
										required
									/>
								)}
								<Input
									label='E-mail'
									type='email'
									placeholder='vous@exemple.fr'
									autoComplete={mode === 'login' ? 'username' : 'email'}
									value={form.email}
									onChange={update('email')}
									required
								/>
								<Input
									label='Mot de passe'
									type={pwdType}
									placeholder='••••••••'
									autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
									value={form.password}
									onChange={update('password')}
									action={toggle}
									required
								/>
								{mode === 'login' && (
									<div className={styles.options}>
										<label className={styles.remember}>
											<input
												type='checkbox'
												className={styles.check}
												checked={remember}
												onChange={(e) => setRemember(e.target.checked)}
											/>
											Se souvenir de moi
										</label>
										<button
											type='button'
											className={styles.link}
											disabled={loading}
											onClick={() => goTo('reset')}
										>
											Mot de passe oublié&nbsp;?
										</button>
									</div>
								)}
								{errorBox}
								<Button type='submit' loading={loading}>
									{mode === 'login' ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}
								</Button>
							</form>
							<p className={styles.switch}>
								{mode === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
								<button
									type='button'
									className={styles.link}
									disabled={loading}
									onClick={() => goTo(mode === 'login' ? 'register' : 'login')}
								>
									{mode === 'login' ? 'Créer un compte' : 'Se connecter'}
								</button>
							</p>
						</>
					)}
				</div>
			</main>
		</div>
	)
}
