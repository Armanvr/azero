import { connectDB } from '@/lib/db'
import type { BnetCacheDoc } from '@/lib/models/BnetCache'
import { BnetCacheModel, makeBnetExpiry } from '@/lib/models/BnetCache'
import type { ItemSource, SourceType } from '@/lib/types'
import {
	cachedGet,
	getProfessionInfo,
	getRecipeDetail,
	getTierCatalog,
	NO_RECIPE_PROFESSIONS,
	STATIC,
} from './professionService'

export const wowheadUrl = (itemId: number) => `https://www.wowhead.com/fr/item=${itemId}`

const INDEX_KEY = 'recipe-name-index'
const normalize = (s: string) => s.trim().toLowerCase()
const CATEGORY_TYPES: Record<string, SourceType> = { RAID: 'raid', DUNGEON: 'dungeon' }

/** One source per (type, instance, name), first one wins. */
function dedup(sources: ItemSource[]): ItemSource[] {
	const seen = new Set<string>()
	return sources.filter((s) => {
		// Blizzard spells the same boss with a plain or a no-break space depending on the journal entry
		const key = `${s.type}|${s.instance ?? ''}|${s.name}`.replace(/\s+/g, ' ')
		return !seen.has(key) && seen.add(key)
	})
}

// ─── Raid and dungeon: the Blizzard journal ─────────────────────────────────

/** Search results carry names as a locale map. */
const frName = (n: unknown): string =>
	typeof n === 'string' ? n : ((n as { fr_FR?: string } | undefined)?.fr_FR ?? '')

interface Encounter {
	name: string
	instanceId: number
}

const searchEncounters = (itemId: number) =>
	cachedGet<Encounter[]>(
		`journal-search:${itemId}`,
		`/data/wow/search/journal-encounter?namespace=static-eu&items.item.id=${itemId}`,
		// shortcut: first page only (up to 100 encounters), an item never drops from that many
		(raw) =>
			(raw.results ?? []).flatMap((r: { data?: { name?: unknown; instance?: { id?: number } } }) => {
				const name = frName(r.data?.name)
				const instanceId = r.data?.instance?.id
				return name && typeof instanceId === 'number' ? [{ name, instanceId }] : []
			}),
	)

interface Instance {
	name: string
	expansion?: string
	category?: string // Blizzard category type: RAID, DUNGEON…
	difficulties: string[] // mode names
}

const getInstance = (id: number) =>
	cachedGet<Instance>(`journal-instance:v2:${id}`, `/data/wow/journal-instance/${id}?${STATIC}`, (raw) => ({
		name: String(raw.name),
		expansion: raw.expansion?.name,
		category: raw.category?.type,
		difficulties: (raw.modes ?? []).flatMap((m: { mode?: { type?: string; name?: string } }) => {
			// Blizzard's fr_FR name for LFR is « Raids », misleading as a difficulty
			const name = m.mode?.type === 'LFR' ? 'Recherche de raid' : m.mode?.name
			return name ? [name] : []
		}),
	}))

/**
 * Raid and dungeon sources from the Blizzard journal. `pending` when a Blizzard call failed: the answer is then
 * not final and must not be cached as « no source ».
 */
export async function findEncounterSources(itemId: number): Promise<{ sources: ItemSource[]; pending: boolean }> {
	const search = await searchEncounters(itemId)
	if (!search.data) return { sources: [], pending: true }

	const ids = [...new Set(search.data.map((e) => e.instanceId))]
	const instances = new Map(await Promise.all(ids.map(async (id) => [id, await getInstance(id)] as const)))

	let pending = false
	const sources = search.data.flatMap((e): ItemSource[] => {
		const { data: instance, status } = instances.get(e.instanceId) ?? { data: null, status: 0 }
		if (!instance) {
			// An instance Blizzard does not know (404) is just not a source; any other failure is transient
			if (status !== 404) pending = true
			return []
		}
		const type = CATEGORY_TYPES[instance.category ?? '']
		if (!type) return []
		return [
			{
				type,
				name: e.name,
				instance: instance.name,
				...(instance.expansion ? { expansion: instance.expansion } : {}),
				...(instance.difficulties.length ? { difficulties: instance.difficulties } : {}),
			},
		]
	})
	return { sources: dedup(sources), pending }
}

// ─── Craft: recipe-name index ───────────────────────────────────────────────

/**
 * `rows` are [normalised recipe name, recipe id, profession name]: an array, names can hold characters Mongo keys
 * cannot. `partial`: a tier kept failing, so a recipe may be missing; the index then lives PARTIAL_TTL_MS only.
 */
interface RecipeIndex {
	rows: Array<[string, number, string]>
	partial: boolean
}

const PARTIAL_TTL_MS = 10 * 60_000

async function readRecipeIndex(): Promise<RecipeIndex | null> {
	try {
		await connectDB()
		const hit = await BnetCacheModel.findOne({
			key: INDEX_KEY,
			expiresAt: { $gt: new Date() },
		}).lean<BnetCacheDoc>()
		const data = hit?.data as RecipeIndex | undefined
		return Array.isArray(data?.rows) ? data : null
	} catch {
		return null
	}
}

/** Recipes whose name is the item's, kept only when Blizzard says the recipe crafts this very item. */
export async function findCraftSources(
	itemId: number,
	itemName: string,
): Promise<{ sources: ItemSource[]; pending: boolean }> {
	const index = await readRecipeIndex()
	if (!index) return { sources: [], pending: true }

	const name = normalize(itemName)
	const candidates = name ? index.rows.filter(([n]) => n === name) : []
	const details = await Promise.all(candidates.map(([, id]) => getRecipeDetail(id)))

	let pending = false
	const sources = details.flatMap((r, i): ItemSource[] => {
		if (!r.data) {
			// A recipe Blizzard does not know (404) is permanent, not a reason to stay pending
			if (r.status !== 404) pending = true
			return []
		}
		return r.data.craftedItems?.some((c) => c.id === itemId)
			? [{ type: 'craft', name: r.data.name, conditions: candidates[i][2] }]
			: []
	})
	const crafts = dedup(sources)
	// shortcut: while the index is partial, « no craft found » is not final (the recipe may sit in the missing tier)
	return { sources: crafts, pending: pending || (index.partial && crafts.length === 0) }
}

async function crawlRecipes(): Promise<void> {
	// Outside any try: with Mongo down the crawl's result could not be stored, so abort before any Blizzard call
	await connectDB()
	if (await readRecipeIndex()) return
	const professions = await cachedGet<number[]>('profession-index', `/data/wow/profession/index?${STATIC}`, (raw) =>
		(raw.professions ?? []).map((p: { id: number }) => p.id),
	)
	if (!professions.data) {
		console.error('recipe index', professions.status, '/data/wow/profession/index')
		return
	}

	// A failing tier (anything but 404, which is just an empty profession) makes the index partial, not absent
	let complete = true
	const rows: RecipeIndex['rows'] = []
	const seen = new Set<number>()
	for (const id of professions.data.filter((id) => !NO_RECIPE_PROFESSIONS.has(id))) {
		const info = await getProfessionInfo(id)
		if (!info.data) {
			if (info.status !== 404) complete = false
			continue
		}
		for (const t of info.data.skillTiers) {
			// One at a time: ~170 calls fired in bursts get 429 from Blizzard (observed)
			const c = await getTierCatalog(id, t.id)
			if (!c.data) {
				if (c.status !== 404) complete = false
				continue
			}
			// Blizzard sends a null name for recipes without a fr_FR translation: nothing to match on
			for (const { recipes } of c.data.categories)
				for (const r of recipes)
					if (typeof r.name === 'string' && !seen.has(r.id) && seen.add(r.id))
						rows.push([normalize(r.name), r.id, info.data.name])
		}
	}
	if (!complete) console.error('recipe index partial, retried in', PARTIAL_TTL_MS / 60_000, 'min')
	const data: RecipeIndex = { rows, partial: !complete }
	await BnetCacheModel.updateOne(
		{ key: INDEX_KEY },
		{ $set: { data, expiresAt: makeBnetExpiry(complete ? undefined : PARTIAL_TTL_MS) } },
		{ upsert: true },
	)
}

let building: Promise<void> | null = null

/**
 * Crawls every recipe profession and tier and stores the name index for 7 days. Meant for `after()`, never for a
 * user request. No-op when the index exists; concurrent calls share one crawl.
 */
export function buildRecipeIndex(): Promise<void> {
	building ??= crawlRecipes()
		.catch((err) => console.error('recipe index', err))
		.finally(() => {
			building = null
		})
	return building
}
