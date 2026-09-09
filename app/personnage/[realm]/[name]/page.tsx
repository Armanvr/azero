'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CharAvatar from '@/components/character/CharAvatar'
import ItemDetailPanel from '@/components/equipment/ItemDetailPanel'
import ItemSlot from '@/components/equipment/ItemSlot'
import ObtainableItem from '@/components/equipment/ObtainableItem'
import CharacterBar from '@/components/layout/CharacterBar'
import Header from '@/components/layout/Header'
import type { Character, ObtainableItemData, SelectedItem } from '@/lib/types'

const CATEGORY_TABS: { id: string; label: string }[] = [
	{ id: 'head', label: 'TÊTE' },
	{ id: 'shoulders', label: 'ÉPAULES' },
	{ id: 'chest', label: 'TORSE' },
	{ id: 'legs', label: 'JAMBES' },
]

export default function CharacterPage() {
	const params = useParams<{ realm: string; name: string }>()
	const router = useRouter()
	const { realm, name } = params

	const [character, setCharacter] = useState<Character | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
	const [activeCategory, setActiveCategory] = useState('head')
	const [obtainable, setObtainable] = useState<ObtainableItemData[]>([])

	useEffect(() => {
		setLoading(true)
		setError(null)
		fetch(`/api/characters/public/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`)
			.then((r) => r.json())
			.then((j) => {
				if (j.error) {
					setError(j.error)
				} else {
					setCharacter(j.character as Character)
				}
			})
			.catch(() => setError('Erreur réseau'))
			.finally(() => setLoading(false))
	}, [realm, name])

	useEffect(() => {
		fetch(`/api/items/slot/${activeCategory}`)
			.then((r) => (r.ok ? r.json() : { items: [] }))
			.then((j) => setObtainable(j.items as ObtainableItemData[]))
	}, [activeCategory])

	if (loading) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
				<Header active='personnage' />
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

	if (error || !character) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
				<Header active='personnage' />
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 16,
					}}
				>
					<div style={{ fontSize: 14, color: 'var(--red)' }}>{error ?? 'Personnage introuvable.'}</div>
					<button
						type='button'
						onClick={() => router.push('/')}
						style={{
							padding: '8px 20px',
							background: 'var(--surface2)',
							border: '1px solid var(--border)',
							borderRadius: 6,
							color: 'var(--text-dim)',
							fontSize: 12,
							cursor: 'pointer',
							fontFamily: "'Exo 2', sans-serif",
						}}
					>
						Nouvelle recherche
					</button>
				</div>
			</div>
		)
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
			<Header active='personnage' />
			<CharacterBar characters={[character]} selectedId={character.id} onSelect={() => {}} />

			<div
				style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
			>
				<div
					style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 160px 160px 1fr', overflow: 'hidden' }}
				>
					<div
						style={{
							padding: '14px 12px',
							display: 'flex',
							flexDirection: 'column',
							gap: 6,
							overflowY: 'auto',
							borderRight: '1px solid var(--border)',
						}}
					>
						<div
							style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 4 }}
						>
							ÉQUIPEMENT
						</div>
						{character.slotsLeft.map((slot) => (
							<ItemSlot
								key={slot.id}
								slot={slot}
								side='left'
								isActive={selectedItem?.name === slot.item}
								onSelect={setSelectedItem}
							/>
						))}
					</div>

					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '16px 8px',
							borderRight: '1px solid var(--border)',
							background: 'var(--surface)',
							overflowY: 'auto',
						}}
					>
						<div style={{ marginBottom: 8, textAlign: 'center', width: '100%' }}>
							{character.title && (
								<div
									style={{
										fontSize: 9,
										color: 'var(--text-muted)',
										marginBottom: 2,
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{character.title}
								</div>
							)}
							<div
								style={{
									fontSize: 16,
									fontFamily: 'Rajdhani',
									fontWeight: 700,
									color: character.color,
									letterSpacing: 1,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{character.name}
							</div>
						</div>

						<CharAvatar character={character} size={144} />

						<div style={{ marginTop: 10, textAlign: 'center', width: '100%' }}>
							<div
								style={{
									fontSize: 9,
									color: 'var(--text-muted)',
									marginBottom: 3,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{character.race} {character.spec ? `${character.spec} ` : ''}
								{character.class}
							</div>
							<div
								style={{
									fontSize: 9,
									color: 'var(--text-muted)',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{character.guild ? `‹${character.guild}› ` : ''}
								{character.realm}
							</div>
							<div
								style={{
									marginTop: 8,
									display: 'flex',
									gap: 4,
									justifyContent: 'center',
									flexWrap: 'wrap',
								}}
							>
								{character.ilvl > 0 && (
									<span
										style={{
											padding: '2px 6px',
											background: 'var(--surface3)',
											borderRadius: 3,
											fontSize: 9,
											color: 'var(--text-dim)',
											border: '1px solid var(--border)',
										}}
									>
										iLvl {character.ilvl}
									</span>
								)}
							</div>
						</div>
					</div>

					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'stretch',
							justifyContent: 'center',
							padding: '16px 8px',
							borderRight: '1px solid var(--border)',
							background: 'var(--surface)',
							gap: 6,
							overflowY: 'auto',
						}}
					>
						<div
							style={{
								fontSize: 10,
								color: 'var(--text-muted)',
								letterSpacing: '1px',
								marginBottom: 4,
								textAlign: 'center',
							}}
						>
							ARMES
						</div>
						{character.slotsWeapon.length === 0 ? (
							<div
								style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', opacity: 0.5 }}
							>
								—
							</div>
						) : (
							character.slotsWeapon.map((slot) => (
								<ItemSlot
									key={slot.id}
									slot={slot}
									side='left'
									isActive={selectedItem?.name === slot.item}
									onSelect={setSelectedItem}
								/>
							))
						)}
					</div>

					<div
						style={{
							padding: '14px 12px',
							display: 'flex',
							flexDirection: 'column',
							gap: 6,
							overflowY: 'auto',
						}}
					>
						<div
							style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 4 }}
						>
							ÉQUIPEMENT
						</div>
						{character.slotsRight.map((slot) => (
							<ItemSlot
								key={slot.id}
								slot={slot}
								side='right'
								isActive={selectedItem?.name === slot.item}
								onSelect={setSelectedItem}
							/>
						))}
					</div>
				</div>

				<div
					style={{
						borderTop: '1px solid var(--border)',
						background: 'var(--surface)',
						flexShrink: 0,
						height: 240,
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<div
						style={{
							display: 'flex',
							gap: 2,
							padding: '8px 16px 0',
							borderBottom: '1px solid var(--border)',
							overflowX: 'auto',
						}}
					>
						{CATEGORY_TABS.map((cat) => {
							const isActive = activeCategory === cat.id
							return (
								<button
									type='button'
									key={cat.id}
									onClick={() => setActiveCategory(cat.id)}
									style={{
										padding: '5px 14px',
										background: 'transparent',
										border: 'none',
										borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
										color: isActive ? 'var(--gold-light)' : 'var(--text-muted)',
										fontSize: 11,
										fontWeight: 600,
										letterSpacing: '0.5px',
										cursor: 'pointer',
										fontFamily: "'Exo 2', sans-serif",
										whiteSpace: 'nowrap',
										transition: 'all 0.15s',
									}}
								>
									{cat.label}
								</button>
							)
						})}
					</div>
					<div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
								gap: 6,
							}}
						>
							{obtainable.map((item, i) => (
								<ObtainableItem
									key={item.name}
									item={item}
									index={i}
									isActive={selectedItem?.name === item.name}
									onSelect={setSelectedItem}
								/>
							))}
						</div>
					</div>
				</div>

				{selectedItem && <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />}
			</div>
		</div>
	)
}
