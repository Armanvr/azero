import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { OBTAINABLE_CATEGORIES } from '@/lib/mock-data'

export async function GET(_req: Request, { params }: { params: Promise<{ slot: string }> }) {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
	const { slot } = await params
	const cat = OBTAINABLE_CATEGORIES.find((c) => c.id === slot)
	if (!cat) return NextResponse.json({ items: [] })
	return NextResponse.json({ items: cat.items })
}
