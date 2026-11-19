import { connectDB } from '@/lib/db'
import type { BnetCacheDoc } from '@/lib/models/BnetCache'
import { BnetCacheModel, makeBnetExpiry } from '@/lib/models/BnetCache'
import type { RecipeDetail, RecipeRef, TierCatalog } from '@/lib/types'
import type { BnetResult } from './bnetToken'
import { bnetGet, EU_BASE, getBnetClientToken } from './bnetToken'

/** Pêche and Archéologie are progression only: no recipe catalog, no known recipes. */
export const NO_RECIPE_PROFESSIONS = new Set([356, 794])

const STATIC = 'namespace=static-eu&locale=fr_FR'
const STATIC_MEDIA = 'namespace=static-eu'
// Status reported when no Blizzard token can be obtained (credentials missing or rejected)
const NO_TOKEN = 503

/** `status` is Blizzard's (or 503 without a token); `data` is null on any failure. */
export interface StaticResult<T> {
	status: number
	data: T | null
}

/** A positive integer from a URL segment, null when it is anything else. */
export function parseId(s: string): number | null {
	const n = Number(s)
	return /^[1-9]\d*$/.test(s) && Number.isSafeInteger(n) ? n : null
}

/**
 * Blizzard static data through the Mongo cache. The mapped value is what gets cached; a Blizzard failure is never
 * cached, and an unavailable DB just means every call goes to Blizzard.
 */
async function cachedGet<T>(key: string, path: string, map: (raw: BnetResult['data']) => T): Promise<StaticResult<T>> {
	try {
		await connectDB()
		const hit = await BnetCacheModel.findOne({ key, expiresAt: { $gt: new Date() } }).lean<BnetCacheDoc>()
		if (hit) return { status: 200, data: hit.data as T }
	} catch {
		// DB unavailable: fall through to Blizzard
	}

	const token = await getBnetClientToken()
	if (!token) return { status: NO_TOKEN, data: null }
	const { status, data: raw } = await bnetGet(`${EU_BASE}${path}`, token)
	if (!raw) return { status, data: null }

	let data: T
	try {
		data = map(raw)
	} catch {
		// Body that is not shaped like Blizzard's: an upstream failure, not cacheable
		return { status: 502, data: null }
	}
	try {
		await BnetCacheModel.updateOne({ key }, { $set: { data, expiresAt: makeBnetExpiry() } }, { upsert: true })
	} catch {
		// Cache write is best effort
	}
	return { status, data }
}

const ref = ({ id, name }: RecipeRef): RecipeRef => ({ id, name })

/** First media asset (`key` is unreliable). '' when there is none or when it is not an https URL (it feeds a redirect). */
const mapIcon = (raw: BnetResult['data']): string => {
	const url = raw.assets?.[0]?.value
	return typeof url === 'string' && url.startsWith('https://') ? url : ''
}

// ─── Professions ────────────────────────────────────────────────────────────

interface ProfessionInfo {
	name: string // fr_FR
	skillTiers: RecipeRef[]
}

export const getProfessionInfo = (id: number) =>
	cachedGet<ProfessionInfo>(
		`profession:${id}`,
		`/data/wow/profession/${id}?${STATIC}`,
		(raw): ProfessionInfo => ({
			name: raw.name,
			skillTiers: (raw.skill_tiers ?? []).map(ref),
		}),
	)

/** '' when the profession has no icon. */
export const getProfessionIcon = (id: number) =>
	cachedGet(`profession-media:${id}`, `/data/wow/media/profession/${id}?${STATIC_MEDIA}`, mapIcon)

// ─── Expansions ─────────────────────────────────────────────────────────────

// Blizzard gives no expansion field: deduced from the tier name. English names too, since the profile endpoint
// answers in English (they are the fallback when the static catalog is down).
const EXPANSIONS: Array<[RegExp, string]> = [
	[/classique|classic/, 'Classic'],
	[/outreterre|outland/, 'The Burning Crusade'],
	[/norfendre|northrend/, 'Wrath of the Lich King'],
	[/cataclysm/, 'Cataclysm'],
	[/pandarie|pandaria/, 'Mists of Pandaria'],
	[/draenor/, 'Warlords of Draenor'],
	[/legion/, 'Legion'],
	[/kul tiras|zandalar/, 'Battle for Azeroth'],
	[/ombreterre|shadowlands/, 'Shadowlands'],
	[/îles aux dragons|dragon isles/, 'Dragonflight'],
	[/khaz algar/, 'The War Within'],
	[/midnight/, 'Midnight'],
]

/** Expansion label and chronological order (index in the table) of a tier name; -1 when not recognised. */
export function expansionOf(tierName: string): { expansion: string; expansionOrder: number } {
	const name = tierName.toLowerCase()
	const order = EXPANSIONS.findIndex(([re]) => re.test(name))
	return order === -1
		? { expansion: tierName, expansionOrder: -1 }
		: { expansion: EXPANSIONS[order][1], expansionOrder: order }
}

// ─── Tiers and recipes ──────────────────────────────────────────────────────

export const getTierCatalog = (professionId: number, tierId: number) =>
	cachedGet<TierCatalog>(
		`tier:${professionId}:${tierId}`,
		`/data/wow/profession/${professionId}/skill-tier/${tierId}?${STATIC}`,
		(raw): TierCatalog => ({
			id: raw.id,
			name: raw.name,
			categories: (raw.categories ?? []).map((c: { name: string; recipes?: RecipeRef[] }) => ({
				name: c.name,
				recipes: (c.recipes ?? []).map(ref),
			})),
		}),
	)

/** Only the fields Blizzard provides are emitted (many recipes have nothing but id and name). */
function mapRecipe(raw: BnetResult['data']): Omit<RecipeDetail, 'icon'> {
	const craftedItems: NonNullable<RecipeDetail['craftedItems']> = [
		...(raw.crafted_item ? [ref(raw.crafted_item)] : []),
		...(raw.alliance_crafted_item ? [{ ...ref(raw.alliance_crafted_item), faction: 'alliance' as const }] : []),
		...(raw.horde_crafted_item ? [{ ...ref(raw.horde_crafted_item), faction: 'horde' as const }] : []),
	]
	const q = raw.crafted_quantity
	const craftedQuantity = Object.fromEntries(
		Object.entries({ value: q?.value, min: q?.minimum, max: q?.maximum }).filter(([, v]) => v != null),
	)
	const optionalSlots: string[] = (raw.modified_crafting_slots ?? []).flatMap(
		(s: { slot_type?: { name?: string } }) => (s.slot_type?.name ? [s.slot_type.name] : []),
	)
	return {
		id: raw.id,
		name: raw.name,
		...(raw.description ? { description: raw.description } : {}),
		...(typeof raw.rank === 'number' ? { rank: raw.rank } : {}),
		...(craftedItems.length ? { craftedItems } : {}),
		...(Object.keys(craftedQuantity).length ? { craftedQuantity } : {}),
		...(raw.reagents?.length
			? {
					reagents: raw.reagents.map((r: { reagent: RecipeRef; quantity: number }) => ({
						...ref(r.reagent),
						quantity: r.quantity,
					})),
				}
			: {}),
		...(optionalSlots.length ? { optionalSlots } : {}),
	}
}

/** '' when the recipe has no icon. One Blizzard media call per recipe, hence the cache. */
export const getRecipeIcon = (id: number) =>
	cachedGet(`recipe-media:${id}`, `/data/wow/media/recipe/${id}?${STATIC_MEDIA}`, mapIcon)

export async function getRecipeDetail(id: number): Promise<StaticResult<RecipeDetail>> {
	const [recipe, icon] = await Promise.all([
		cachedGet(`recipe:${id}`, `/data/wow/recipe/${id}?${STATIC}`, mapRecipe),
		getRecipeIcon(id),
	])
	if (!recipe.data) return { status: recipe.status, data: null }
	// A failing icon call only leaves the icon out (and is not cached, so a later request retries)
	return { status: recipe.status, data: { ...recipe.data, ...(icon.data ? { icon: icon.data } : {}) } }
}
