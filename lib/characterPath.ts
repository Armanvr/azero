/**
 * Blizzard realm slug by string rule: « Chants éternels » → `chants-eternels`, « Kael'thas » → `kaelthas`.
 * Only a fallback: the server resolves the real slug from Blizzard's realm index (lib/services/realm.ts).
 */
export function realmSlug(realm: string): string {
	return realm
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/^-+|-+$/g, '') // a real slug never starts or ends with a dash: « - » alone is no realm
}

/** Character id used across the app: `name-realmslug` (names never contain a dash, realm slugs can). */
export function charId(name: string, slug: string): string {
	return `${name.toLowerCase()}-${slug}`
}

/** Href of a character page from what the user typed or what the API returned. */
export function characterPath(name: string, realm: string): string {
	return `/personnage/${encodeURIComponent(realmSlug(realm))}/${encodeURIComponent(name.trim().toLowerCase())}`
}

/** API URL for the character page. `useParams()` returns segments still percent-encoded: decode before re-encoding. */
export function apiPathFromParams({ realm, name }: { realm: string; name: string }): string {
	const decode = (s: string) => {
		try {
			return decodeURIComponent(s)
		} catch {
			return s // malformed sequence typed in the URL: keep it raw
		}
	}
	const segment = (s: string) => encodeURIComponent(decode(s).toLowerCase())
	return `/api/characters/public/${segment(realm)}/${segment(name)}`
}
