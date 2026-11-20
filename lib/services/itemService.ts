import { connectDB } from '@/lib/db'
import type { ItemCacheDoc } from '@/lib/models/ItemCache'
import { BNET_STAT_LABELS, ITEM_CACHE_VERSION, ItemCacheModel, makeItemExpiry } from '@/lib/models/ItemCache'
import { cachedGet, STATIC } from './professionService'
import { findCraftSources, findEncounterSources } from './sourceService'

interface BnetStatEntry {
	type?: { type?: string; name?: string }
	value?: number
}

interface BnetItem {
	name: string
	type: string
	slot: string
	stats: string[]
}

const getBnetItem = (itemId: number) =>
	cachedGet<BnetItem>(`item:${itemId}`, `/data/wow/item/${itemId}?${STATIC}`, (raw) => ({
		name: raw.name ?? '',
		type: raw.item_class?.name ?? '',
		slot: raw.inventory_type?.name ?? '',
		stats: ((raw.preview_item?.stats ?? []) as BnetStatEntry[]).flatMap((s) => {
			const label = s.type?.type ? (BNET_STAT_LABELS[s.type.type] ?? s.type.name ?? s.type.type) : null
			return label && s.value != null ? [`${s.value.toLocaleString('fr-FR')} ${label}`] : []
		}),
	}))

/**
 * The item and where it comes from. Null only when the Blizzard item call fails. `pending` means a source lookup
 * is not final (recipe index not built yet, or a Blizzard call failed): the result is then not stored, so it is
 * never mistaken for « no source ».
 */
export async function getItemData(itemId: number): Promise<(ItemCacheDoc & { pending: boolean }) | null> {
	// 1. MongoDB cache. Only documents of the current shape: older ones expire by TTL and are never read.
	try {
		await connectDB()
		const cached = await ItemCacheModel.findOne({
			itemId,
			v: ITEM_CACHE_VERSION,
			expiresAt: { $gt: new Date() },
		}).lean<ItemCacheDoc>()

		if (cached) return { ...cached, pending: false }
	} catch {
		// DB unavailable — fall through
	}

	// 2. Blizzard
	const item = await getBnetItem(itemId)
	if (!item.data) return null
	const [encounters, crafts] = await Promise.all([
		findEncounterSources(itemId),
		findCraftSources(itemId, item.data.name),
	])

	const doc: ItemCacheDoc = {
		v: ITEM_CACHE_VERSION,
		itemId,
		...item.data,
		sources: [...encounters.sources, ...crafts.sources],
		fetchedAt: new Date(),
		expiresAt: makeItemExpiry(),
	}
	const pending = encounters.pending || crafts.pending

	// 3. Save to cache (fire-and-forget), only when every lookup is final
	if (!pending) {
		connectDB()
			.then(() => ItemCacheModel.findOneAndUpdate({ itemId }, { $set: doc }, { upsert: true, new: true }))
			.catch(() => {})
	}

	return { ...doc, pending }
}
