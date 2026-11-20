import { NextResponse } from 'next/server'
import { resolveRealm } from '@/lib/services/realm'
import { getCharacterTalents } from '@/lib/services/talentService'

const UPSTREAM_ERROR = 'Battle.net est indisponible. Réessayez dans un instant.'

// GET /api/characters/public/[realm]/[name]/talents
export async function GET(_req: Request, { params }: { params: Promise<{ realm: string; name: string }> }) {
	const { realm, name } = await params
	// Same resolution as the public character route: whatever the user typed becomes the real Blizzard slug
	const result = await getCharacterTalents(await resolveRealm(realm), name.toLowerCase()).catch((err) => {
		console.error('public talents', err)
		return { status: 502 as const }
	})

	if (result.status === 200) return NextResponse.json({ talents: result.talents })
	if (result.status === 404) return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })
	return NextResponse.json({ error: UPSTREAM_ERROR }, { status: result.status })
}
