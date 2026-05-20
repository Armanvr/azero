import { NextResponse } from 'next/server'
import { CLASS_COLORS, CLASS_ID_TO_NAME } from '@/lib/constants'
import { connectDB, makeExpiry, SearchCacheModel } from '@/lib/db'
import type { Character, EquippedItem, ItemRarity } from '@/lib/types'

const EU_BASE = 'https://eu.api.blizzard.com'
const TOKEN_URL = 'https://oauth.battle.net/token'

// ─── BNet client credentials token (in-memory cache) ───────────────────────

interface TokenCache {
	value: string
	expiresAt: number
}
let tokenCache: TokenCache | null = null

async function getClientToken(): Promise<string | null> {
	if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
		return tokenCache.value
	}
	const clientId = process.env.BNET_CLIENT_ID
	const clientSecret = process.env.BNET_CLIENT_SECRET
	if (!clientId || !clientSecret) return null

	const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${credentials}`,
		},
		body: 'grant_type=client_credentials',
	})
	if (!res.ok) return null
	const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number }
	tokenCache = { value: access_token, expiresAt: Date.now() + expires_in * 1000 }
	return access_token
}

async function bnetFetch(url: string, token: string) {
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
	if (!res.ok) return null
	return res.json()
}

// ─── Slot mappings ──────────────────────────────────────────────────────────

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

const LEFT_SLOTS = new Set(['head', 'neck', 'shoulders', 'back', 'chest', 'shirt', 'tabard', 'wrist'])
const WEAPON_SLOTS = new Set(['mainhand', 'offhand'])

const QUALITY_MAP: Record<string, ItemRarity> = {
	POOR: 'common',
	COMMON: 'common',
	UNCOMMON: 'uncommon',
	RARE: 'rare',
	EPIC: 'epic',
	LEGENDARY: 'legendary',
}

// ─── BNet fetch + build Character ──────────────────────────────────────────

async function fetchCharacterFromBNet(realm: string, name: string): Promise<Character | null> {
	const token = await getClientToken()
	if (!token) return null

	const locale = 'fr_FR'
	const profileNs = 'namespace=profile-eu'
	const staticNs = 'namespace=static-eu'
	const charPath = `${EU_BASE}/profile/wow/character/${realm}/${name}`

	const [summary, media, equipment] = await Promise.all([
		bnetFetch(`${charPath}?${profileNs}&locale=${locale}`, token),
		bnetFetch(`${charPath}/character-media?${profileNs}&locale=${locale}`, token),
		bnetFetch(`${charPath}/equipment?${profileNs}&locale=${locale}`, token),
	])

	if (!summary) return null

	const assets: Array<{ key: string; value: string }> = media?.assets ?? []
	const avatarUrl = assets.find((a) => a.key === 'avatar')?.value

	const classId: number = summary.character_class?.id ?? 0
	const wowClass = CLASS_ID_TO_NAME[classId] ?? 'Guerrier'
	const color = CLASS_COLORS[wowClass] ?? 'var(--text)'
	const realmSlug: string = summary.realm?.slug ?? realm
	const charName: string = summary.name ?? name

	const rawItems: Array<{
		slot: { type: string }
		item: { id: number }
		quality: { type: string }
		name: string
		level: { value: number }
		enchantments?: Array<{ display_string: string; enchantment_slot: { type: string } }>
	}> = equipment?.equipped_items ?? []

	const iconResults = await Promise.all(
		rawItems.map(async (raw) => {
			const itemId = raw.item?.id
			if (!itemId) return { itemId: 0, iconUrl: undefined }
			const mediaData = await bnetFetch(
				`${EU_BASE}/data/wow/media/item/${itemId}?${staticNs}&locale=${locale}`,
				token,
			)
			const iconAssets: Array<{ key: string; value: string }> = mediaData?.assets ?? []
			const iconUrl = iconAssets.find((a) => a.key === 'icon')?.value
			return { itemId, iconUrl }
		}),
	)
	const iconByItemId = new Map(iconResults.map((r) => [r.itemId, r.iconUrl]))

	const ring1Used = { used: false }
	const trinket1Used = { used: false }

	const allSlots: EquippedItem[] = rawItems
		.map((raw) => {
			const bnetSlotType = raw.slot?.type
			let slotId = BNET_SLOT_MAP[bnetSlotType] ?? ''
			if (!slotId) return null

			if (slotId === 'ring1') {
				if (ring1Used.used) slotId = 'ring2'
				else ring1Used.used = true
			}
			if (slotId === 'trinket1') {
				if (trinket1Used.used) slotId = 'trinket2'
				else trinket1Used.used = true
			}

			const itemId = raw.item?.id ?? 0
			const enchantLine =
				raw.enchantments?.find(
					(e) => e.enchantment_slot?.type === 'PERMANENT' || e.enchantment_slot?.type === 'TEMPORARY',
				)?.display_string ?? null

			return {
				id: slotId,
				label: SLOT_LABELS[slotId] ?? slotId,
				item: raw.name ?? '',
				itemId: raw.item?.id,
				ilvl: raw.level?.value ?? 0,
				enchant: enchantLine,
				rarity: QUALITY_MAP[raw.quality?.type] ?? 'common',
				iconUrl: iconByItemId.get(itemId),
			} satisfies EquippedItem
		})
		.filter((s): s is EquippedItem => s !== null)

	return {
		id: `${charName.toLowerCase()}-${realmSlug}`,
		name: charName,
		title: summary.active_title?.display_string?.replace('{name}', charName) ?? '',
		race: summary.race?.name ?? '',
		class: wowClass,
		spec: summary.active_spec?.name ?? '',
		ilvl: summary.equipped_item_level ?? summary.average_item_level ?? 0,
		realm: summary.realm?.name ?? realm,
		guild: summary.guild?.name ?? '',
		faction: summary.faction?.type === 'HORDE' ? 'horde' : 'alliance',
		score: 0,
		gold: 0,
		color,
		avatarUrl,
		slotsLeft: allSlots.filter((s) => LEFT_SLOTS.has(s.id)),
		slotsRight: allSlots.filter((s) => !LEFT_SLOTS.has(s.id) && !WEAPON_SLOTS.has(s.id)),
		slotsWeapon: allSlots.filter((s) => WEAPON_SLOTS.has(s.id)),
	}
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function GET(_req: Request, { params }: { params: Promise<{ realm: string; name: string }> }) {
	const { realm, name } = await params
	const realmKey = realm.toLowerCase()
	const nameKey = name.toLowerCase()
	const region = 'eu'

	// 1. Check MongoDB cache
	try {
		await connectDB()
		const cached = await SearchCacheModel.findOne({
			realm: realmKey,
			name: nameKey,
			region,
			expiresAt: { $gt: new Date() },
		}).lean<{ character: Character }>()

		if (cached?.character) {
			return NextResponse.json({ character: cached.character, cached: true })
		}
	} catch {
		// DB unavailable — fall through to BNet fetch
	}

	// 2. Cache miss → fetch from BNet
	const character = await fetchCharacterFromBNet(realmKey, nameKey)

	if (!character) {
		return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })
	}

	// 3. Save to cache (fire-and-forget — don't block response)
	connectDB()
		.then(() =>
			SearchCacheModel.findOneAndUpdate(
				{ realm: realmKey, name: nameKey, region },
				{
					$set: {
						character,
						fetchedAt: new Date(),
						expiresAt: makeExpiry(),
					},
				},
				{ upsert: true, new: true },
			),
		)
		.catch(() => {
			// Cache write failure is non-fatal
		})

	return NextResponse.json({ character })
}
