'use client'

interface Tab<T extends string> {
	id: T
	label: string
}

interface Props<T extends string> {
	tabs: Tab<T>[]
	active: T
	onChange: (id: T) => void
}

export default function SegmentTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
	return (
		<div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 6, padding: 3 }}>
			{tabs.map((t) => {
				const isActive = active === t.id
				return (
					<button
						key={t.id}
						type='button'
						onClick={() => onChange(t.id)}
						style={{
							flex: 1,
							padding: '7px 0',
							borderRadius: 4,
							border: 'none',
							cursor: 'pointer',
							fontSize: 12,
							fontWeight: 600,
							letterSpacing: '0.5px',
							fontFamily: "'Exo 2', sans-serif",
							transition: 'all 0.15s',
							background: isActive ? 'var(--surface3)' : 'transparent',
							color: isActive ? 'var(--text)' : 'var(--text-muted)',
						}}
					>
						{t.label}
					</button>
				)
			})}
		</div>
	)
}
