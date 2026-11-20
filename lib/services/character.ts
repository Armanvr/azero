import { charId } from '@/lib/characterPath'
import { CLASS_ID_TO_NAME } from '@/lib/constants'
import { CharacterModel, UserModel } from '@/lib/db'
import type { BnetCharacter, Character, CharacterStats, EquippedItem, ItemRarity, User } from '@/lib/types'
import { bnetFetch, EU_BASE } from './bnetToken'

const SLOT_LABELS: Record<string, string> = {
	head: 'Tête',
	neck: 'Cou',
	shoulders: 'Épaules',
	back: 'Dos',
	chest: 'Torse',
	shirt: 'Chemise',
	tabard: 'Tabard',
	wrist: 'Bracelets',
	hands: 'Gants',
	belt: 'Ceinture',
	legs: 'Jambes',
	boots: 'Bottes',
	ring1: 'Anneau 1',
	ring2: 'Anneau 2',
	trinket1: 'Bijou 1',
	trinket2: 'Bijou 2',
	mainhand: 'Arme',
	offhand: 'Main gauche',
}

const BNET_SLOT_MAP: Record<string, string> = {
	HEAD: 'head',
	NECK: 'neck',
	SHOULDER: 'shoulders',
	BACK: 'back',
	CHEST: 'chest',
	SHIRT: 'shirt',
	WRIST: 'wrist',
	TABARD: 'tabard',
	HANDS: 'hands',
	WAIST: 'belt',
	LEGS: 'legs',
	FEET: 'boots',
	FINGER_1: 'ring1',
	FINGER_2: 'ring2',
	TRINKET_1: 'trinket1',
	TRINKET_2: 'trinket2',
	MAIN_HAND: 'mainhand',
	OFF_HAND: 'offhand',
}

// Left column: Tête - Cou - Épaules - Dos - Torse - Chemise - Tabard - Bracelets
const LEFT_SLOTS = new Set(['head', 'neck', 'shoulders', 'back', 'chest', 'shirt', 'tabard', 'wrist'])
// Bottom center: weapons. Everything else goes in the right column.
const WEAPON_SLOTS = new Set(['mainhand', 'offhand'])

const QUALITY_MAP: Record<string, ItemRarity> = {
	POOR: 'common',
	COMMON: 'common',
	UNCOMMON: 'uncommon',
	RARE: 'rare',
	EPIC: 'epic',
	LEGENDARY: 'legendary',
}

interface BnetEquippedItem {
	slot: { type: string }
	item: { id: number }
	quality: { type: string }
	name: string
	name_description?: { display_string?: string }
	level: { value: number }
	enchantments?: Array<{ display_string: string; enchantment_slot: { type: string } }>
}

/** Blizzard UI markup that leaks into display strings: atlas icons `|A:…|a`, colours `|cffRRGGBB…|r` / `|cnIQ4:…|r`. */
const stripMarkup = (s: string) => s.replace(/\|A:[^|]*\|a|\|c(?:n\w+:|[0-9a-f]{8})|\|r/gi, '').trim()

export function findAsset(media: { assets?: Array<{ key: string; value: string }> } | null, key: string) {
	return media?.assets?.find((a) => a.key === key)?.value
}

/** Maps a Blizzard `/equipment` response to the three slot columns, fetching item icons in parallel. */
export async function mapEquipment(
	equipment: { equipped_items?: BnetEquippedItem[] } | null,
	token: string,
): Promise<Pick<Character, 'slotsLeft' | 'slotsRight' | 'slotsWeapon'>> {
	const rawItems = equipment?.equipped_items ?? []

	// Each distinct item is fetched once (an item worn twice, e.g. two identical rings)
	const itemIds = [...new Set(rawItems.flatMap((raw) => (raw.item?.id ? [raw.item.id] : [])))]
	const iconByItemId = new Map(
		await Promise.all(
			itemIds.map(async (itemId) => {
				const media = await bnetFetch(
					`${EU_BASE}/data/wow/media/item/${itemId}?namespace=static-eu&locale=fr_FR`,
					token,
				)
				return [itemId, findAsset(media, 'icon')] as const
			}),
		),
	)

	let ring1Used = false
	let trinket1Used = false

	const allSlots: EquippedItem[] = rawItems
		.map((raw) => {
			let slotId = BNET_SLOT_MAP[raw.slot?.type] ?? ''
			if (!slotId) return null

			// Handle duplicate ring/trinket slots
			if (slotId === 'ring1') {
				if (ring1Used) slotId = 'ring2'
				else ring1Used = true
			}
			if (slotId === 'trinket1') {
				if (trinket1Used) slotId = 'trinket2'
				else trinket1Used = true
			}

			const variant = stripMarkup(raw.name_description?.display_string ?? '')
			return {
				id: slotId,
				label: SLOT_LABELS[slotId] ?? slotId,
				item: raw.name ?? '',
				itemId: raw.item?.id,
				ilvl: raw.level?.value ?? 0,
				enchant:
					stripMarkup(
						raw.enchantments?.find(
							(e) => e.enchantment_slot?.type === 'PERMANENT' || e.enchantment_slot?.type === 'TEMPORARY',
						)?.display_string ?? '',
					) || null,
				rarity: QUALITY_MAP[raw.quality?.type] ?? 'common',
				iconUrl: iconByItemId.get(raw.item?.id ?? 0),
				...(variant && { variant }),
			} satisfies EquippedItem
		})
		.filter((s) => s !== null)

	return {
		slotsLeft: allSlots.filter((s) => LEFT_SLOTS.has(s.id)),
		slotsRight: allSlots.filter((s) => !LEFT_SLOTS.has(s.id) && !WEAPON_SLOTS.has(s.id)),
		slotsWeapon: allSlots.filter((s) => WEAPON_SLOTS.has(s.id)),
	}
}

const MAIN_STATS = [
	['strength', 'Force'],
	['agility', 'Agilité'],
	['intellect', 'Intelligence'],
] as const

const round1 = (n: number) => Math.round(n * 10) / 10

/** Maps a Blizzard `/statistics` response to the main stat + Endurance and the four secondary percentages. Null when unusable. */
export function mapStats(s: Record<string, unknown> | null): CharacterStats | null {
	if (!s) return null
	const num = (k: string, field: 'effective' | 'value') => {
		const v = s[k]
		const n = typeof v === 'object' && v ? (v as Record<string, unknown>)[field] : undefined
		return typeof n === 'number' ? n : undefined
	}
	const eff = (k: string) => num(k, 'effective')
	const val = (k: string) => num(k, 'value')
	const mains = MAIN_STATS.flatMap(([key, label]) => {
		const value = eff(key)
		return value === undefined ? [] : [{ label, value }]
	})
	if (!mains.length) return null
	const main = mains.reduce((best, cur) => (cur.value > best.value ? cur : best))
	const stamina = eff('stamina')
	const bonus = s.versatility_damage_done_bonus
	const crit = [val('spell_crit'), val('melee_crit')].filter((n) => n !== undefined)
	const secondary = [
		{ label: 'Hâte', pct: val('spell_haste') ?? val('melee_haste') },
		{ label: 'Critique', pct: crit.length ? Math.max(...crit) : undefined },
		{ label: 'Maîtrise', pct: val('mastery') },
		{ label: 'Polyvalence', pct: typeof bonus === 'number' ? bonus : undefined },
	].flatMap(({ label, pct }) => (pct === undefined ? [] : [{ label, pct: round1(pct) }]))
	return {
		primary: [main, ...(stamina === undefined ? [] : [{ label: 'Endurance', value: stamina }])],
		secondary,
	}
}

export function resolveClass(classId: number) {
	return { wowClass: CLASS_ID_TO_NAME[classId] ?? 'Guerrier' }
}

export function bnetToCharacter(c: BnetCharacter): Character {
	const { wowClass } = resolveClass(c.classId)
	return {
		id: charId(c.name, c.realmSlug),
		name: c.name,
		title: c.title ?? '',
		race: c.raceName,
		class: wowClass,
		spec: c.spec ?? '',
		ilvl: c.ilvl ?? 0,
		realm: c.realm,
		guild: c.guildName ?? '',
		faction: c.faction,
		gold: c.gold ?? 0,
		avatarUrl: c.avatarUrl,
		slotsLeft: c.slotsLeft ?? [],
		slotsRight: c.slotsRight ?? [],
		slotsWeapon: c.slotsWeapon ?? [],
	}
}

const MAX_LEVEL = 90

/** The user's max-level characters: favorite first, then sub-favorites, then by name. Shared by /api/characters and /api/professions. */
export async function findSortedUserCharacters(userId: string): Promise<BnetCharacter[]> {
	const [bnetChars, user] = await Promise.all([
		CharacterModel.find({ userId, level: MAX_LEVEL }).lean<BnetCharacter[]>(),
		UserModel.findOne({ id: userId }).lean<User>(),
	])

	const favoriteCharId = user?.favoriteCharId ?? null
	const subFavoriteCharIds = new Set(user?.subFavoriteCharIds ?? [])
	const idOf = (c: BnetCharacter) => charId(c.name, c.realmSlug)

	return bnetChars.sort((a, b) => {
		if (idOf(a) === favoriteCharId) return -1
		if (idOf(b) === favoriteCharId) return 1
		const aSub = subFavoriteCharIds.has(idOf(a))
		const bSub = subFavoriteCharIds.has(idOf(b))
		if (aSub && !bSub) return -1
		if (bSub && !aSub) return 1
		return a.name.localeCompare(b.name)
	})
}

/** Finds one of the user's characters from a `name-realmslug` id (names never contain a dash, realm slugs can). */
export async function findUserCharacter(userId: string, id: string): Promise<BnetCharacter | null> {
	const dashIdx = id.indexOf('-')
	if (dashIdx === -1) return null
	const name = id.slice(0, dashIdx).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return CharacterModel.findOne({
		userId,
		realmSlug: id.slice(dashIdx + 1),
		name: { $regex: `^${name}$`, $options: 'i' },
	}).lean<BnetCharacter>()
}
