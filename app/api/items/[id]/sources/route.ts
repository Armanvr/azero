import { NextResponse } from 'next/server'
import { getItemData } from '@/lib/services/itemService'

// GET /api/items/[id]/sources
// [id] = Blizzard numeric item ID
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const itemId = Number(id)

	if (!itemId || Number.isNaN(itemId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
	}

	const data = await getItemData(itemId)
	if (!data) {
		return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })
	}

	return NextResponse.json({
		name: data.name,
		type: data.type,
		slot: data.slot,
		stats: data.stats,
		sources: data.sources,
	})
}
