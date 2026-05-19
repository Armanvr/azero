import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { usersDb } from '@/lib/db'

export async function PUT(req: NextRequest) {
  const session = await readSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { favoriteCharId?: string | null; subFavoriteCharIds?: string[] }

  const update: Record<string, unknown> = {}
  if ('favoriteCharId' in body) update.favoriteCharId = body.favoriteCharId ?? null
  if ('subFavoriteCharIds' in body) update.subFavoriteCharIds = body.subFavoriteCharIds ?? []

  await usersDb.updateAsync({ id: session.userId }, { $set: update }, {})

  return NextResponse.json({ ok: true })
}
