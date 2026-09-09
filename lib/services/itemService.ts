import { XMLParser } from 'fast-xml-parser'
import { connectDB } from '@/lib/db'
import type { ItemCacheDoc } from '@/lib/models/ItemCache'
import { BNET_DIFF_LABELS, BNET_STAT_LABELS, ItemCacheModel, makeItemExpiry } from '@/lib/models/ItemCache'
import type { Difficulty, ItemSource } from '@/lib/types'
import { bnetFetch, getBnetClientToken } from './bnetToken'

const EU_BASE = 'https://eu.api.blizzard.com'
const WOWHEAD_BASE = 'https://www.wowhead.com'

// ─── Blizzard item fetch ────────────────────────────────────────────────────

interface BnetStatEntry {
	type?: { type?: string; name?: string }
	value?: number
	display?: { display_string?: string }
}

interface BnetItemData {
	name?: string
	item_class?: { name?: string }
	inventory_type?: { name?: string }
	preview_item?: {
		item_level?: { value?: number }
		stats?: BnetStatEntry[]
	}
}

async function fetchBnetItemData(
	itemId: number,
): Promise<{ name: string; type: string; slot: string; stats: string[] } | null> {
	const token = await getBnetClientToken()
	if (!token) return null

	const ns = 'namespace=static-eu&locale=fr_FR'
	const data = (await bnetFetch(`${EU_BASE}/data/wow/item/${itemId}?${ns}`, token)) as BnetItemData | null

	if (!data) return null

	const stats: string[] = (data.preview_item?.stats ?? [])
		.map((s) => {
			const label = s.type?.type ? (BNET_STAT_LABELS[s.type.type] ?? s.type.name ?? s.type.type) : null
			if (!label || s.value == null) return null
			return `${s.value.toLocaleString('fr-FR')} ${label}`
		})
		.filter((s): s is string => s !== null)

	return {
		name: data.name ?? '',
		type: data.item_class?.name ?? '',
		slot: data.inventory_type?.name ?? '',
		stats,
	}
}

// ─── WowHead XML fetch ──────────────────────────────────────────────────────

interface WowheadDropEntry {
	'@_id'?: string | number
	'@_n'?: string
	e?: { '@_n'?: string | number } | Array<{ '@_n'?: string | number }>
}

interface WowheadItem {
	droppedBy?: {
		n?: WowheadDropEntry | WowheadDropEntry[]
	}
	createdBy?: unknown
}

interface WowheadXml {
	wowhead?: {
		item?: WowheadItem
	}
}

async function fetchWowheadSources(itemId: number): Promise<ItemSource[]> {
	const url = `${WOWHEAD_BASE}/item=${itemId}&xml`

	let xml: string
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Azero/1.0; +https://github.com)',
				Accept: 'text/xml,application/xml',
			},
			signal: AbortSignal.timeout(8000),
		})
		if (!res.ok) return []
		xml = await res.text()
	} catch {
		return []
	}

	try {
		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_',
			allowBooleanAttributes: true,
			parseAttributeValue: true,
			isArray: (name) => name === 'n' || name === 'e',
		})

		const parsed = parser.parse(xml) as WowheadXml
		const item = parsed?.wowhead?.item
		if (!item?.droppedBy) return []

		const npcEntries = item.droppedBy.n
		if (!npcEntries) return []

		const entries = Array.isArray(npcEntries) ? npcEntries : [npcEntries]

		return entries
			.filter((entry) => entry['@_n'])
			.map((entry) => {
				const boss = String(entry['@_n'] ?? '')
				// WowHead drop rate is stored as drops-per-10000 in the <e n="..."> child
				const eArr = Array.isArray(entry.e) ? entry.e : entry.e ? [entry.e] : []
				const rawRate = eArr[0]?.['@_n']
				const dropRate = rawRate != null && Number(rawRate) > 0 ? `~${(Number(rawRate) / 100).toFixed(1)}%` : ''

				return {
					boss,
					instance: '', // WowHead XML doesn't embed zone name directly
					difficulty: 'Normal' as Difficulty,
					ilvlRange: '',
					dropRate,
				} satisfies ItemSource
			})
	} catch {
		return []
	}
}

// ─── Blizzard journal — enrich sources with instance names ─────────────────

// Map WowHead NPC name fragments to known instances (fallback, best-effort)
// Full solution would require journal crawl; this covers common cases.

// ─── Public entry point ─────────────────────────────────────────────────────

export async function getItemData(itemId: number): Promise<ItemCacheDoc | null> {
	// 1. Check MongoDB cache
	try {
		await connectDB()
		const cached = await ItemCacheModel.findOne({
			itemId,
			expiresAt: { $gt: new Date() },
		}).lean<ItemCacheDoc>()

		if (cached) return cached
	} catch {
		// DB unavailable — fall through
	}

	// 2. Fetch from Blizzard + WowHead in parallel
	const [bnetData, wowheadSources] = await Promise.all([fetchBnetItemData(itemId), fetchWowheadSources(itemId)])

	if (!bnetData && wowheadSources.length === 0) return null

	const doc: ItemCacheDoc = {
		itemId,
		name: bnetData?.name ?? '',
		type: bnetData?.type ?? '',
		slot: bnetData?.slot ?? '',
		stats: bnetData?.stats ?? [],
		sources: wowheadSources,
		fetchedAt: new Date(),
		expiresAt: makeItemExpiry(),
	}

	// 3. Save to cache (fire-and-forget)
	connectDB()
		.then(() => ItemCacheModel.findOneAndUpdate({ itemId }, { $set: doc }, { upsert: true, new: true }))
		.catch(() => {})

	return doc
}
