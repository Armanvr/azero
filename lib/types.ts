export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

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

export type SourceType = 'raid' | 'dungeon' | 'craft'

export interface ItemSource {
	type: SourceType
	name: string // boss or recipe
	instance?: string
	expansion?: string
	difficulties?: string[] // Blizzard mode names of the instance
	conditions?: string // e.g. required profession
}

export interface ItemDetails {
	type: string
	slot: string
	stats: string[]
	sources: ItemSource[]
	pending: boolean // true: an index is being built, sources are not final
	wowheadUrl: string
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
	variant?: string // Blizzard name_description, e.g. « Héroïque »
}

export interface TalentNode {
	id: number
	row: number
	col: number
	maxRank: number
	rank: number // 0 = not selected
	name: string
	description?: string
	icon?: string
	unlocks: number[]
	choices?: Array<{ name: string; description?: string; icon?: string; selected: boolean }>
}

export interface TalentTree {
	kind: 'class' | 'spec' | 'hero'
	name: string
	spent: number
	nodes: TalentNode[]
}

export interface TalentLoadout {
	name: string
	active: boolean
	code?: string
	trees: TalentTree[]
}

export interface CharacterTalents {
	spec: string
	specIcon?: string
	heroTree?: string
	loadouts: TalentLoadout[]
}

export interface CharacterStats {
	primary: { label: string; value: number }[] // main stat + Endurance
	secondary: { label: string; pct: number }[] // Hâte, Critique, Maîtrise, Polyvalence (percent)
}

// ─── Professions (contract of /api/professions/*) ───────────────────────────

export interface RecipeRef {
	id: number
	name: string
}

/** One expansion of a profession, as learned by a character. */
export interface ProfessionTier {
	id: number // Blizzard skill tier id
	name: string // fr_FR, from the static catalog ("Forge de Midnight")
	expansion: string // display label ("Midnight"); the tier name when the expansion is not recognised
	expansionOrder: number // chronological, higher = more recent; -1 when not recognised
	skill: number
	max: number
	knownRecipes: RecipeRef[] // always [] when the profession has no recipe system
}

export interface CharacterProfession {
	id: number // Blizzard profession id
	name: string // fr_FR, from the static catalog; Blizzard's profile name as a fallback
	kind: 'primary' | 'secondary'
	icon?: string
	hasRecipes: boolean // false for Pêche and Archéologie
	tiers: ProfessionTier[] // most recent expansion first; [] for Archéologie
	// Only for a profession Blizzard reports without tiers (Archéologie)
	skill?: number
	max?: number
}

export interface ProfessionCharacter {
	id: string // `name-realmslug`
	name: string
	realmSlug: string
	class: WowClass
	spec: string
	level: number
	// False when Blizzard never answered for this character: recipe status is then unknown, never "missing"
	professionsKnown: boolean
	professions: CharacterProfession[] // primaries first, then secondaries
}

/** GET /api/professions/[professionId]/tiers/[tierId]: the Blizzard recipe catalog of one expansion. */
export interface TierCatalog {
	id: number
	name: string
	categories: Array<{ name: string; recipes: RecipeRef[] }>
}

/** GET /api/professions/recipes/[id]: every optional field is absent when Blizzard does not provide it. */
export interface RecipeDetail {
	id: number
	name: string
	icon?: string
	description?: string
	rank?: number
	craftedItems?: Array<RecipeRef & { faction?: 'alliance' | 'horde' }>
	craftedQuantity?: { value?: number; min?: number; max?: number }
	reagents?: Array<RecipeRef & { quantity: number }>
	optionalSlots?: string[] // names of the modified crafting slots
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
	// (new field names: documents cached before the profession manager hold another shape under `professions`)
	professionData?: CharacterProfession[]
	professionDataFetchedAt?: number // ms timestamp
}
