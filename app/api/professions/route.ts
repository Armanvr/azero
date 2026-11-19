import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { charId } from '@/lib/characterPath'
import { CharacterModel, connectDB } from '@/lib/db'
import { bnetFetch, EU_BASE, getBnetClientToken } from '@/lib/services/bnetToken'
import { findSortedUserCharacters, resolveClass } from '@/lib/services/character'
import {
	expansionOf,
	getProfessionIcon,
	getProfessionInfo,
	NO_RECIPE_PROFESSIONS,
} from '@/lib/services/professionService'
import type { BnetCharacter, CharacterProfession, ProfessionCharacter, ProfessionTier, RecipeRef } from '@/lib/types'

const CACHE_TTL_MS = 60 * 60 * 1000
// Of the secondary professions only these are kept (no Secourisme): Cuisine, Pêche, Archéologie
const SECONDARY_IDS = new Set([185, 356, 794])

interface BnetEntry {
	profession: { id: number; name: string }
	tiers?: Array<{
		skill_points: number
		max_skill_points: number
		tier: { id: number; name: string }
		known_recipes?: RecipeRef[]
	}>
	// Archéologie: no tiers, the skill sits on the entry
	skill_points?: number
	max_skill_points?: number
}

/** The boolean is false when a static call (catalog or icon) failed and the English fallback was used. */
async function mapProfession(p: BnetEntry, kind: CharacterProfession['kind']): Promise<[CharacterProfession, boolean]> {
	const { id } = p.profession
	// The profile endpoint answers in English whatever the locale: names come from the static catalog
	const [info, icon] = await Promise.all([getProfessionInfo(id), getProfessionIcon(id)])
	const tierNames = new Map(info.data?.skillTiers.map((t) => [t.id, t.name]))
	const hasRecipes = !NO_RECIPE_PROFESSIONS.has(id)

	const tiers: ProfessionTier[] = (p.tiers ?? [])
		.map((t) => {
			const name = tierNames.get(t.tier.id) ?? t.tier.name
			return {
				id: t.tier.id,
				name,
				...expansionOf(name),
				skill: t.skill_points,
				max: t.max_skill_points,
				knownRecipes: hasRecipes ? (t.known_recipes ?? []).map(({ id, name }) => ({ id, name })) : [],
			}
		})
		.sort((a, b) => b.expansionOrder - a.expansionOrder)

	const profession: CharacterProfession = {
		id,
		name: info.data?.name ?? p.profession.name,
		kind,
		...(icon.data ? { icon: icon.data } : {}),
		hasRecipes,
		tiers,
		...(!tiers.length && typeof p.max_skill_points === 'number'
			? { skill: p.skill_points ?? 0, max: p.max_skill_points }
			: {}),
	}
	// A Blizzard 404 is a real answer (nothing to show), only other failures are transient
	return [profession, [info, icon].every((r) => r.data !== null || r.status === 404)]
}

/** Primaries then secondaries, and whether every static call succeeded. Null when Blizzard fails. */
async function fetchProfessions(
	c: BnetCharacter,
	token: string,
): Promise<{ professions: CharacterProfession[]; complete: boolean } | null> {
	const url = `${EU_BASE}/profile/wow/character/${encodeURIComponent(c.realmSlug)}/${encodeURIComponent(c.name.toLowerCase())}/professions?namespace=profile-eu&locale=fr_FR`
	const data = await bnetFetch(url, token)
	if (!data) return null
	const primaries = ((data.primaries ?? []) as BnetEntry[]).map((p) => mapProfession(p, 'primary'))
	const secondaries = ((data.secondaries ?? []) as BnetEntry[])
		.filter((p) => SECONDARY_IDS.has(p.profession.id))
		.map((p) => mapProfession(p, 'secondary'))
	const mapped = await Promise.all([...primaries, ...secondaries])
	return { professions: mapped.map(([p]) => p), complete: mapped.every(([, ok]) => ok) }
}

async function professionsOf(
	c: BnetCharacter,
	token: string | null,
): Promise<Pick<ProfessionCharacter, 'professionsKnown' | 'professions'>> {
	if (c.professionDataFetchedAt && Date.now() - c.professionDataFetchedAt < CACHE_TTL_MS) {
		return { professionsKnown: true, professions: c.professionData ?? [] }
	}
	// On failure keep showing what was last cached (never cached as fresh, so the next request retries).
	// Without any cache the status is unknown: documents cached before the profession manager have another shape
	// under other field names, so they land here too.
	const stale = { professionsKnown: c.professionData !== undefined, professions: c.professionData ?? [] }
	if (!token) return stale
	let fetched: Awaited<ReturnType<typeof fetchProfessions>>
	try {
		fetched = await fetchProfessions(c, token)
	} catch {
		// Network error: this character just shows its last known professions, the others are unaffected
		return stale
	}
	if (!fetched) return stale
	const { professions, complete } = fetched
	// A failed static call (English fallback names, no icon) is served but never cached, so the next request retries
	if (complete) {
		try {
			await CharacterModel.updateOne(
				{ _id: c._id },
				{ $set: { professionData: professions, professionDataFetchedAt: Date.now() } },
			)
		} catch {
			// Cache write is best effort: Blizzard did answer
		}
	}
	return { professionsKnown: true, professions }
}

export async function GET() {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

	await connectDB()

	const bnetChars = await findSortedUserCharacters(session.userId)
	// Client-credentials token, like the public route: never expires on the user's side
	const token = bnetChars.length ? await getBnetClientToken() : null

	const characters: ProfessionCharacter[] = await Promise.all(
		bnetChars.map(async (c) => ({
			id: charId(c.name, c.realmSlug),
			name: c.name,
			realmSlug: c.realmSlug,
			class: resolveClass(c.classId).wowClass,
			spec: c.spec ?? '',
			level: c.level,
			...(await professionsOf(c, token)),
		})),
	)

	return NextResponse.json({ characters })
}
