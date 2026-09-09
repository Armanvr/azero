export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'purple'

export type Difficulty = 'LFR' | 'Normal' | 'Heroïque' | 'Mythique' | 'M+' | 'Craft' | 'Réputation' | 'Quête'

export type EquipmentSlot =
	| 'head'
	| 'neck'
	| 'shoulders'
	| 'back'
	| 'chest'
	| 'wrist'
	| 'tabard'
	| 'hands'
	| 'gloves'
	| 'belt'
	| 'legs'
	| 'boots'
	| 'ring1'
	| 'ring2'
	| 'trinket1'
	| 'trinket2'
	| 'mainhand'
	| 'offhand'

export type WowClass =
	| 'Paladin'
	| 'Mage'
	| 'Chasseur'
	| 'Guerrier'
	| 'Prêtre'
	| 'Démoniste'
	| 'Chaman'
	| 'Druide'
	| 'Voleur'
	| 'Moine'
	| 'Chasseur de démons'
	| 'Chevalier de la mort'
	| 'Evocateur'

export interface ItemSource {
	boss: string
	instance: string
	difficulty: Difficulty
	ilvlRange: string
	dropRate: string
}

export interface ItemDetails {
	type: string
	slot: string
	stats: string[]
	sources: ItemSource[]
}

export interface EquippedItem {
	id: string // slot id (head, neck…)
	label: string
	item: string // item name
	itemId?: number // Blizzard item ID — used for detail lookups
	ilvl: number
	enchant: string | null
	rarity: ItemRarity
	iconUrl?: string
}

export interface ObtainableItemData {
	name: string
	rarity: ItemRarity
	isSet: boolean
	count: number
	ilvl: number
}

export interface ObtainableCategory {
	id: string
	label: string
	items: ObtainableItemData[]
}

export interface Character {
	id: string
	name: string
	title: string
	race: string
	class: WowClass
	spec: string
	ilvl: number
	realm: string
	guild: string
	faction: 'horde' | 'alliance'
	score: number
	gold: number
	color: string
	avatarUrl?: string
	slotsLeft: EquippedItem[]
	slotsRight: EquippedItem[]
	slotsWeapon: EquippedItem[]
}

export interface User {
	id: string
	email: string
	username: string
	passwordHash: string
	createdAt: string
	bnetAccessToken?: string
	bnetTokenExpiry?: number
	bnetConnected?: boolean
	favoriteCharId?: string
	subFavoriteCharIds?: string[]
}

export interface SessionPayload {
	userId: string
	email: string
	username: string
	[key: string]: unknown
}

export interface SelectedItem {
	name: string
	itemId?: number // Blizzard item ID — used for detail lookups
	ilvl: number
	rarity: ItemRarity
	enchant?: string | null
	slot?: string
	isSet?: boolean
}

export interface BnetCharacter {
	_id?: string
	userId: string
	name: string
	realm: string
	realmSlug: string
	classId: number
	className: string
	raceId: number
	raceName: string
	level: number
	faction: 'horde' | 'alliance'
	fetchedAt: string
	// Enriched fields (populated lazily via POST /api/characters/[id]/enrich)
	avatarUrl?: string
	mainRawUrl?: string
	ilvl?: number
	spec?: string
	specId?: number
	title?: string
	guildName?: string
	gold?: number
	slotsLeft?: EquippedItem[]
	slotsRight?: EquippedItem[]
	slotsWeapon?: EquippedItem[]
	enrichedAt?: string
}
