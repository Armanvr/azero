import { realmSlug } from '@/lib/characterPath'
import { bnetFetch, EU_BASE, getBnetClientToken } from './bnetToken'

const TTL_MS = 24 * 60 * 60 * 1000

interface BnetRealmIndex {
	realms?: Array<{ slug?: string; name?: string | Record<string, string> }>
}

// « Arak-arahm », « arak arahm », « Aggra (Português) », « Гордунни »... all reduce to the same key
const keyOf = (s: string) =>
	s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]/gu, '')

let cache: { map: Map<string, string>; expiresAt: number } | null = null
// Concurrent callers share one index request
let pending: Promise<Map<string, string> | null> | null = null

async function fetchIndex(): Promise<Map<string, string> | null> {
	const token = await getBnetClientToken()
	if (!token) return null
	// No `locale`: each realm's `name` is then an object holding every locale
	const data = (await bnetFetch(
		`${EU_BASE}/data/wow/realm/index?namespace=dynamic-eu`,
		token,
	)) as BnetRealmIndex | null
	if (!Array.isArray(data?.realms)) return null

	const map = new Map<string, string>()
	for (const { slug, name } of data.realms) {
		if (!slug) continue
		for (const n of typeof name === 'string' ? [name] : Object.values(name ?? {})) {
			const k = keyOf(n)
			if (k && !map.has(k)) map.set(k, slug)
		}
		map.set(keyOf(slug), slug) // a slug always wins over another realm's name
	}
	return map.size ? map : null
}

async function loadIndex(): Promise<Map<string, string> | null> {
	if (cache && Date.now() < cache.expiresAt) return cache.map
	pending ??= fetchIndex()
		.then((map) => {
			// A failure is not cached (the next call retries) and keeps serving the expired map
			if (map) cache = { map, expiresAt: Date.now() + TTL_MS }
			return map ?? cache?.map ?? null
		})
		.finally(() => {
			pending = null
		})
	return pending
}

/** Real Blizzard slug of a realm typed by a user (slug or any localised name). Falls back to the string rule when the index is unavailable or has no match. */
export async function resolveRealm(input: string): Promise<string> {
	return (await loadIndex())?.get(keyOf(input)) ?? realmSlug(input)
}
