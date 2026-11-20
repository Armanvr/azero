import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { getRecipeDetail, parseId } from '@/lib/services/professionService'

// GET /api/professions/recipes/[id]: one recipe, with its icon
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

	const id = parseId((await params).id)
	if (id === null) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

	const { status, data } = await getRecipeDetail(id)
	if (!data) {
		return status === 404
			? NextResponse.json({ error: 'Introuvable' }, { status: 404 })
			: NextResponse.json({ error: 'Blizzard indisponible' }, { status: 502 })
	}
	return NextResponse.json(data)
}
