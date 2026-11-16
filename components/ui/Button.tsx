import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	loading?: boolean
}

export default function Button({ loading, children, disabled, className, ...rest }: Props) {
	return (
		<button
			{...rest}
			className={className ? `${styles.button} ${className}` : styles.button}
			disabled={disabled || loading}
		>
			{loading ? 'Chargement...' : children}
		</button>
	)
}
