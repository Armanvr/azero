import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { CharacterModel, connectDB } from '@/lib/db'
import { bnetFetch, bnetGet, EU_BASE, getBnetClientToken } from '@/lib/services/bnetToken'
import { findAsset, findUserCharacter, mapEquipment } from '@/lib/services/character'
import type { BnetCharacter } from '@/lib/types'

const UPSTREAM_ERROR = 'Battle.net est indisponible. Réessayez dans un instant.'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const { id } = await params
	if (!id.includes('-')) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

	await connectDB()

	const existing = await findUserCharacter(session.userId, id)
	if (!existing) return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })

	// Client-credentials token: profile endpoints are public, and the user's OAuth token expires after 24 h
	const token = await getBnetClientToken()
	if (!token) return NextResponse.json({ error: UPSTREAM_ERROR }, { status: 503 })

	const charPath = `${EU_BASE}/profile/wow/character/${encodeURIComponent(existing.realmSlug)}/${encodeURIComponent(existing.name.toLowerCase())}`
	const query = '?namespace=profile-eu&locale=fr_FR'

	const [summaryRes, media, equipment, currencies] = await Promise.all([
		bnetGet(`${charPath}${query}`, token),
		bnetFetch(`${charPath}/character-media${query}`, token),
		bnetFetch(`${charPath}/equipment${query}`, token),
		bnetFetch(`${charPath}/currencies${query}`, token),
	])

	// Never overwrite the stored character with empty values when Blizzard did not answer
	// A real 404 means the character was renamed or transferred, like on the public route
	const summary = summaryRes.data
	if (summaryRes.status === 404) return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })
	if (!summary) return NextResponse.json({ error: UPSTREAM_ERROR }, { status: 502 })

	// Gold from currencies (currency id 1 = gold, quantity in copper)
	const goldEntry = currencies?.currencies?.find(
		(c: { currency: { id: number }; quantity: number }) => c.currency?.id === 1,
	)

	// Optional parts (media, equipment, currencies) that failed are left out of the update instead of blanking what is stored
	const avatarUrl = findAsset(media, 'avatar')
	const enriched: Partial<BnetCharacter> = {
		...(avatarUrl && { avatarUrl }),
		ilvl: summary.equipped_item_level ?? summary.average_item_level ?? 0,
		spec: summary.active_spec?.name ?? '',
		specId: summary.active_spec?.id ?? 0,
		title: summary.active_title?.display_string?.replace('{name}', existing.name) ?? '',
		guildName: summary.guild?.name ?? '',
		...(currencies && { gold: goldEntry ? Math.floor(goldEntry.quantity / 10000) : 0 }),
		...(equipment && (await mapEquipment(equipment, token))),
		enrichedAt: new Date().toISOString(),
	}

	await CharacterModel.updateOne({ _id: existing._id }, { $set: enriched })

	const updated: BnetCharacter = { ...existing, ...enriched }
	return NextResponse.json({ character: updated })
}
