'use client'
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	loading?: boolean
}

export default function Button({ loading, children, disabled, ...rest }: Props) {
	const isDisabled = disabled || loading
	return (
		<button
			{...rest}
			disabled={isDisabled}
			style={{
				marginTop: 4,
				padding: '11px',
				background: isDisabled ? 'var(--surface3)' : 'var(--gold)',
				color: isDisabled ? 'var(--text-dim)' : '#0c0c10',
				border: 'none',
				borderRadius: 4,
				fontSize: 13,
				fontWeight: 700,
				letterSpacing: 1,
				fontFamily: 'Rajdhani',
				cursor: isDisabled ? 'not-allowed' : 'pointer',
				transition: 'all 0.15s',
				...rest.style,
			}}
		>
			{loading ? 'Chargement...' : children}
		</button>
	)
}
