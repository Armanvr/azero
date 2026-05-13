import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { ITEM_SOURCES } from '@/lib/mock-data'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
	const { id } = await params
	const name = decodeURIComponent(id)
	const data = ITEM_SOURCES[name]
	if (!data) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })
	return NextResponse.json({ name, ...data })
}
