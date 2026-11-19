import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { getRecipeIcon, parseId } from '@/lib/services/professionService'

// GET /api/professions/recipes/[id]/icon: redirects to the recipe icon (src of lazy-loaded <img>, one Blizzard call each)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

	const id = parseId((await params).id)
	if (id === null) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

	const { status, data } = await getRecipeIcon(id)
	if (data === null) {
		return status === 404
			? NextResponse.json({ error: 'Introuvable' }, { status: 404 })
			: NextResponse.json({ error: 'Blizzard indisponible' }, { status: 502 })
	}
	// '' = Blizzard answered without any icon
	if (!data) return NextResponse.json({ error: 'Pas d’icône' }, { status: 404 })

	const res = NextResponse.redirect(data, 302)
	res.headers.set('Cache-Control', 'private, max-age=604800')
	return res
}
