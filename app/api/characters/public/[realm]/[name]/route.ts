import { NextResponse } from 'next/server'
import { charId } from '@/lib/characterPath'
import { connectDB, makeExpiry, SearchCacheModel } from '@/lib/db'
import { bnetGet, EU_BASE, getBnetClientToken } from '@/lib/services/bnetToken'
import { findAsset, mapEquipment, mapStats, resolveClass } from '@/lib/services/character'
import { resolveRealm } from '@/lib/services/realm'
import type { Character } from '@/lib/types'

const NOT_FOUND_TTL_MS = 5 * 60 * 1000
const UPSTREAM_ERROR = 'Battle.net est indisponible. Réessayez dans un instant.'

type Lookup = { status: 200; character: Character } | { status: 404 | 502 | 503 }

async function fetchCharacterFromBNet(realm: string, name: string): Promise<Lookup> {
	const token = await getBnetClientToken()
	if (!token) return { status: 503 }

	// realm and name come from the URL: encode them so they cannot change the Blizzard path or query
	const charPath = `${EU_BASE}/profile/wow/character/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`
	const query = '?namespace=profile-eu&locale=fr_FR'

	// Only the summary decides the status: media, equipment and statistics are optional and degrade to nothing
	const [summaryRes, media, equipment, statistics] = await Promise.all([
		bnetGet(`${charPath}${query}`, token),
		bnetGet(`${charPath}/character-media${query}`, token),
		bnetGet(`${charPath}/equipment${query}`, token),
		bnetGet(`${charPath}/statistics${query}`, token),
	])

	const summary = summaryRes.data
	if (summaryRes.status === 404) return { status: 404 }
	if (!summary) return { status: 502 }

	const { wowClass } = resolveClass(summary.character_class?.id ?? 0)
	const slug: string = summary.realm?.slug ?? realm
	const charName: string = summary.name ?? name

	const stats = mapStats(statistics.data)
	const renderUrl = findAsset(media.data, 'main-raw')
	return {
		status: 200,
		character: {
			id: charId(charName, slug),
			name: charName,
			title: summary.active_title?.display_string?.replace('{name}', charName) ?? '',
			race: summary.race?.name ?? '',
			class: wowClass,
			spec: summary.active_spec?.name ?? '',
			level: summary.level,
			...(renderUrl && { renderUrl }),
			...(summary.last_login_timestamp && { lastLogin: summary.last_login_timestamp }),
			...(stats && { stats }),
			ilvl: summary.equipped_item_level ?? summary.average_item_level ?? 0,
			realm: summary.realm?.name ?? realm,
			guild: summary.guild?.name ?? '',
			faction: summary.faction?.type === 'HORDE' ? 'horde' : 'alliance',
			gold: 0,
			avatarUrl: findAsset(media.data, 'avatar'),
			...(await mapEquipment(equipment.data, token)),
		},
	}
}

export async function GET(_req: Request, { params }: { params: Promise<{ realm: string; name: string }> }) {
	const { realm, name } = await params
	// Whatever the user typed (slug, localised name, accents...) becomes the real Blizzard slug
	const realmKey = await resolveRealm(realm)
	const nameKey = name.toLowerCase()
	const region = 'eu'

	// 1. Check MongoDB cache (a null character is a cached 404)
	try {
		await connectDB()
		const cached = await SearchCacheModel.findOne({
			realm: realmKey,
			name: nameKey,
			region,
			expiresAt: { $gt: new Date() },
		}).lean<{ character?: Character | null }>()

		if (cached?.character) return NextResponse.json({ character: cached.character, cached: true })
		if (cached) return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })
	} catch {
		// DB unavailable — fall through to BNet fetch
	}

	// 2. Cache miss → fetch from BNet
	// A malformed Blizzard payload must not become a bodiless 500
	const result = await fetchCharacterFromBNet(realmKey, nameKey).catch((err): Lookup => {
		console.error('public character', err)
		return { status: 502 }
	})

	if (result.status === 502 || result.status === 503) {
		// Upstream failures are never cached
		return NextResponse.json({ error: UPSTREAM_ERROR }, { status: result.status })
	}

	// 3. Save to cache (fire-and-forget — don't block response). A real 404 is cached for a few minutes.
	const character = result.status === 200 ? result.character : null
	connectDB()
		.then(() =>
			SearchCacheModel.findOneAndUpdate(
				{ realm: realmKey, name: nameKey, region },
				{
					$set: {
						character,
						fetchedAt: new Date(),
						expiresAt: makeExpiry(character ? undefined : NOT_FOUND_TTL_MS),
					},
				},
				{ upsert: true, new: true },
			),
		)
		.catch(() => {
			// Cache write failure is non-fatal
		})

	if (!character) return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })
	return NextResponse.json({ character })
}
