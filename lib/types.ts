export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type Difficulty = 'LFR' | 'Normal' | 'Heroïque' | 'Mythique' | 'M+' | 'Craft' | 'Réputation' | 'Quête'

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

export interface CharacterStats {
	primary: { label: string; value: number }[] // main stat + Endurance
	secondary: { label: string; pct: number }[] // Hâte, Critique, Maîtrise, Polyvalence (percent)
}

export interface Profession {
	name: string
	tier: number // Blizzard tier id: higher = more recent expansion
	skill: number
	max: number
}

export interface ProfessionCharacter {
	id: string // `name-realmslug`
	name: string
	realmSlug: string
	class: WowClass
	spec: string
	level: number
	professions: Profession[] // primary professions only, at most 2
}

export interface Character {
	id: string
	name: string
	title: string
	race: string
	class: WowClass
	spec: string
	level?: number
	renderUrl?: string // full-body Blizzard render (`main-raw`)
	lastLogin?: number // ms timestamp
	stats?: CharacterStats
	ilvl: number
	realm: string
	guild: string
	faction: 'horde' | 'alliance'
	gold: number
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
	recoveryCodeHash?: string
	createdAt: string
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
	// Cached by GET /api/professions for one hour
	professions?: Profession[]
	professionsFetchedAt?: number // ms timestamp
}
