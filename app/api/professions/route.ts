import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { charId } from '@/lib/characterPath'
import { CharacterModel, connectDB } from '@/lib/db'
import { bnetFetch, EU_BASE, getBnetClientToken } from '@/lib/services/bnetToken'
import { findSortedUserCharacters, resolveClass } from '@/lib/services/character'
import type { BnetCharacter, Profession, ProfessionCharacter } from '@/lib/types'

const CACHE_TTL_MS = 60 * 60 * 1000

interface BnetPrimary {
	profession: { name: string }
	tiers?: Array<{ skill_points: number; max_skill_points: number; tier: { id: number } }>
}

/** Primary professions at the most recent expansion tier (highest tier id). Null when Blizzard fails. */
async function fetchProfessions(c: BnetCharacter, token: string): Promise<Profession[] | null> {
	const url = `${EU_BASE}/profile/wow/character/${encodeURIComponent(c.realmSlug)}/${encodeURIComponent(c.name.toLowerCase())}/professions?namespace=profile-eu&locale=fr_FR`
	const data = await bnetFetch(url, token)
	if (!data) return null
	return ((data.primaries ?? []) as BnetPrimary[]).flatMap((p) => {
		const tier = p.tiers?.length ? p.tiers.reduce((best, t) => (t.tier.id > best.tier.id ? t : best)) : undefined
		return tier
			? [{ name: p.profession.name, tier: tier.tier.id, skill: tier.skill_points, max: tier.max_skill_points }]
			: []
	})
}

async function professionsOf(c: BnetCharacter, token: string | null): Promise<Profession[]> {
	if (c.professionsFetchedAt && Date.now() - c.professionsFetchedAt < CACHE_TTL_MS) return c.professions ?? []
	// On failure keep showing what was last cached (never cached as fresh, so the next request retries)
	const stale = c.professions ?? []
	if (!token) return stale
	try {
		const professions = await fetchProfessions(c, token)
		if (!professions) return stale
		await CharacterModel.updateOne({ _id: c._id }, { $set: { professions, professionsFetchedAt: Date.now() } })
		return professions
	} catch {
		// Network or DB error: this character just shows its last known professions, the others are unaffected
		return stale
	}
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
			professions: await professionsOf(c, token),
		})),
	)

	return NextResponse.json({ characters })
}
