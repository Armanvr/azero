import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { usersDb, charactersDb } from '@/lib/db'

export async function POST() {
  const session = await readSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await usersDb.updateAsync(
    { id: session.userId },
    { $set: { bnetConnected: false } },
    {}
  )
  await usersDb.updateAsync(
    { id: session.userId },
    { $unset: { bnetAccessToken: true, bnetTokenExpiry: true } },
    {}
  )

  await charactersDb.removeAsync({ userId: session.userId }, { multi: true })

  return NextResponse.json({ ok: true })
}
