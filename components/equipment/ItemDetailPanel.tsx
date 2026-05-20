'use client'
import { useEffect, useState } from 'react'
import { RARITY_COLORS } from '@/lib/constants'
import type { ItemDetails, SelectedItem } from '@/lib/types'
import SourceCard from './SourceCard'

interface Props {
	item: SelectedItem
	onClose: () => void
}

export default function ItemDetailPanel({ item, onClose }: Props) {
	const [data, setData] = useState<ItemDetails | null>(null)
	const [loading, setLoading] = useState(false)
	const rc = RARITY_COLORS[item.rarity] || '#9d9d9d'

	useEffect(() => {
		// Requires item ID — skip if not available (legacy data without itemId)
		if (!item.itemId) {
			setLoading(false)
			return
		}
		let cancelled = false
		setLoading(true)
		setData(null)
		fetch(`/api/items/${item.itemId}/sources`)
			.then((r) => (r.ok ? r.json() : null))
			.then((json) => {
				if (cancelled) return
				if (json?.sources) {
					setData({ type: json.type, slot: json.slot, stats: json.stats, sources: json.sources })
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [item.itemId])

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				right: 0,
				bottom: 0,
				width: 320,
				background: 'var(--surface)',
				borderLeft: '1px solid var(--border2)',
				display: 'flex',
				flexDirection: 'column',
				zIndex: 200,
				animation: 'slideInR 0.22s ease',
				boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
			}}
		>
			<div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							style={{
								fontSize: 13,
								fontWeight: 700,
								color: rc,
								fontFamily: 'Rajdhani',
								letterSpacing: '0.5px',
								lineHeight: 1.3,
								textTransform: 'uppercase',
							}}
						>
							{item.name}
						</div>
						{item.slot && (
							<div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
								{item.slot}
								{data ? ` · ${data.type}` : ''}
							</div>
						)}
					</div>
					<button
						type='button'
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							color: 'var(--text-muted)',
							cursor: 'pointer',
							fontSize: 16,
							lineHeight: 1,
							padding: '2px 4px',
							flexShrink: 0,
							borderRadius: 3,
							transition: 'color 0.15s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.color = 'var(--text)'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.color = 'var(--text-muted)'
						}}
						aria-label='Fermer'
					>
						✕
					</button>
				</div>

				<div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
					<span
						style={{
							padding: '3px 8px',
							borderRadius: 3,
							fontSize: 11,
							fontWeight: 700,
							fontFamily: 'Rajdhani',
							background: `${rc}18`,
							color: rc,
							border: `1px solid ${rc}33`,
						}}
					>
						iLvl {item.ilvl}
					</span>
					<span
						style={{
							padding: '3px 8px',
							borderRadius: 3,
							fontSize: 10,
							background: 'var(--surface2)',
							color: 'var(--text-dim)',
							border: '1px solid var(--border)',
						}}
					>
						{item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
					</span>
					{item.enchant && (
						<span
							style={{
								fontSize: 10,
								color: 'var(--blue)',
								display: 'flex',
								alignItems: 'center',
								gap: 3,
							}}
						>
							✦ {item.enchant}
						</span>
					)}
				</div>
			</div>

			{data?.stats && data.stats[0] !== '–' && (
				<div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
					<div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>
						STATISTIQUES
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
						{data.stats.map((s, _i) => (
							<div
								key={Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000}
								style={{
									fontSize: 11,
									color: 'var(--text-dim)',
									display: 'flex',
									alignItems: 'center',
									gap: 6,
								}}
							>
								<span
									style={{
										width: 3,
										height: 3,
										borderRadius: '50%',
										background: 'var(--border2)',
										flexShrink: 0,
									}}
								/>
								{s}
							</div>
						))}
					</div>
				</div>
			)}

			<div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
				<div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 10 }}>
					SOURCES D&apos;OBTENTION
				</div>
				{loading ? (
					<div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
						Chargement…
					</div>
				) : data ? (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{data.sources.map((s, i) => (
							<SourceCard
								key={Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000}
								source={s}
								index={i}
							/>
						))}
					</div>
				) : (
					<div style={{ padding: '20px 0', textAlign: 'center' }}>
						<div style={{ fontSize: 22, marginBottom: 8, opacity: 0.3 }}>🔍</div>
						<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucune source disponible</div>
					</div>
				)}
			</div>

			<div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
				<div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
					Cliquez sur un autre item pour comparer
				</div>
			</div>
		</div>
	)
}
