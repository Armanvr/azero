'use client'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
	label?: string
}

const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, ...rest }, ref) {
	return (
		<div>
			{label && (
				<label
					style={{
						fontSize: 11,
						color: 'var(--text-dim)',
						letterSpacing: '0.5px',
						marginBottom: 5,
						display: 'block',
					}}
					htmlFor={rest.id}
				>
					{label}
				</label>
			)}
			<input
				ref={ref}
				{...rest}
				style={{
					width: '100%',
					padding: '10px 12px',
					background: 'var(--surface2)',
					border: '1px solid var(--border2)',
					borderRadius: 4,
					color: 'var(--text)',
					fontSize: 13,
					fontFamily: "'Exo 2', sans-serif",
					outline: 'none',
					transition: 'border-color 0.15s',
				}}
				onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
				onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
			/>
		</div>
	)
})

export default Input
