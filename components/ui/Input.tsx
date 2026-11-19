import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import styles from './Input.module.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
	label?: string
	// control shown at the right edge inside the field (e.g. show/hide password)
	action?: ReactNode
}

export default function Input({ label, action, className, ...rest }: Props) {
	const autoId = useId()
	const id = rest.id ?? autoId
	return (
		<div className={styles.field}>
			{label && (
				<label className={styles.label} htmlFor={id}>
					{label}
				</label>
			)}
			<div className={styles.wrap}>
				<input
					{...rest}
					id={id}
					className={className ? `${styles.input} ${className}` : styles.input}
					data-action={action ? '' : undefined}
				/>
				{action && <div className={styles.action}>{action}</div>}
			</div>
		</div>
	)
}
