'use client'
import { useEffect, useState } from 'react'
import styles from './RecoveryCode.module.css'

export default function RecoveryCode({ code }: { code: string }) {
	const [copied, setCopied] = useState(false)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		if (!copied) return
		const t = setTimeout(() => setCopied(false), 2000)
		return () => clearTimeout(t)
	}, [copied])

	async function copy() {
		try {
			await navigator.clipboard.writeText(code)
			setFailed(false)
			setCopied(true)
		} catch {
			setFailed(true)
		}
	}

	return (
		<div>
			<div className={styles.box}>
				<code className={styles.code}>{code}</code>
				<button type='button' className={styles.copy} onClick={copy}>
					{copied ? 'Copié ✓' : 'Copier'}
				</button>
			</div>
			{failed && (
				<div role='alert' className={styles.error}>
					Copie impossible : sélectionnez le code manuellement.
				</div>
			)}
		</div>
	)
}
