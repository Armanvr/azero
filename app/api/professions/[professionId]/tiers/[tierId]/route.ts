import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { getTierCatalog, NO_RECIPE_PROFESSIONS, parseId } from '@/lib/services/professionService'

// GET /api/professions/[professionId]/tiers/[tierId]: the Blizzard recipe catalog of one expansion
export async function GET(_req: Request, { params }: { params: Promise<{ professionId: string; tierId: string }> }) {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

	const raw = await params
	const professionId = parseId(raw.professionId)
	const tierId = parseId(raw.tierId)
	if (professionId === null || tierId === null) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
	// Pêche and Archéologie have no recipes
	if (NO_RECIPE_PROFESSIONS.has(professionId)) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

	const { status, data } = await getTierCatalog(professionId, tierId)
	if (!data) {
		return status === 404
			? NextResponse.json({ error: 'Introuvable' }, { status: 404 })
			: NextResponse.json({ error: 'Blizzard indisponible' }, { status: 502 })
	}
	return NextResponse.json(data)
}
