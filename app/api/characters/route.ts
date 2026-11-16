import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { bnetToCharacter, findSortedUserCharacters } from '@/lib/services/character'

export async function GET() {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

	await connectDB()

	return NextResponse.json({ characters: (await findSortedUserCharacters(session.userId)).map(bnetToCharacter) })
}
