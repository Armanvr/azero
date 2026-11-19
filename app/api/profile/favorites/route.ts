import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { connectDB, UserModel } from '@/lib/db'

const isCharId = (v: unknown) => typeof v === 'string' && v.length <= 100

export async function PUT(req: Request) {
	const session = await readSession()
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

	const body = await req.json().catch(() => null)
	if (typeof body !== 'object' || body === null) {
		return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
	}
	const favoriteCharId = body.favoriteCharId ?? null
	const subFavoriteCharIds = body.subFavoriteCharIds ?? []
	const validSubs = Array.isArray(subFavoriteCharIds) && subFavoriteCharIds.length <= 200
	if ((favoriteCharId !== null && !isCharId(favoriteCharId)) || !validSubs || !subFavoriteCharIds.every(isCharId)) {
		return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
	}

	const update: Record<string, unknown> = {}
	if ('favoriteCharId' in body) update.favoriteCharId = favoriteCharId
	if ('subFavoriteCharIds' in body) update.subFavoriteCharIds = subFavoriteCharIds

	await connectDB()
	await UserModel.updateOne({ id: session.userId }, { $set: update })

	return NextResponse.json({ ok: true })
}
