import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { usersDb, charactersDb } from '@/lib/db'
import type { BnetCharacter, User } from '@/lib/types'

export async function GET() {
  const session = await readSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await usersDb.findOneAsync<User>({ id: session.userId })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const characters = await charactersDb.findAsync<BnetCharacter>({ userId: session.userId })

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      bnetConnected: user.bnetConnected ?? false,
    },
    characters,
  })
}
