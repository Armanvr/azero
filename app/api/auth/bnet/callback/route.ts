import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
import { usersDb, charactersDb } from '@/lib/db'
import type { BnetCharacter } from '@/lib/types'

interface BnetTokenResponse {
  access_token: string
  expires_in: number
}

interface BnetRealm {
  name: string
  slug: string
}

interface BnetCharacterRaw {
  name: string
  realm: BnetRealm
  playable_class: { id: number; name: string }
  playable_race: { id: number; name: string }
  faction: { type: string }
  level: number
}

interface BnetProfileResponse {
  wow_accounts?: Array<{ characters?: BnetCharacterRaw[] }>
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateParam = searchParams.get('state')

  if (error || !code) {
    return NextResponse.redirect(new URL('/profil?error=bnet_denied', req.url))
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('bnet_oauth_state')?.value

  if (!storedState || !stateParam || storedState !== stateParam) {
    cookieStore.delete('bnet_oauth_state')
    return NextResponse.redirect(new URL('/profil?error=bnet_invalid_state', req.url))
  }

  cookieStore.delete('bnet_oauth_state')

  const session = await readSession()
  if (!session) return NextResponse.redirect(new URL('/auth', req.url))

  const clientId = process.env.BNET_CLIENT_ID
  const clientSecret = process.env.BNET_CLIENT_SECRET
  const redirectUri = process.env.BNET_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/profil?error=bnet_not_configured', req.url))
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const tokenRes = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/profil?error=token_failed', req.url))
  }

  const { access_token, expires_in } = (await tokenRes.json()) as BnetTokenResponse

  const charsRes = await fetch(
    'https://eu.api.blizzard.com/profile/user/wow?namespace=profile-eu&locale=fr_FR',
    { headers: { Authorization: `Bearer ${access_token}` } }
  )

  if (!charsRes.ok) {
    return NextResponse.redirect(new URL('/profil?error=chars_failed', req.url))
  }

  const charsData = (await charsRes.json()) as BnetProfileResponse

  await usersDb.updateAsync(
    { id: session.userId },
    {
      $set: {
        bnetAccessToken: access_token,
        bnetTokenExpiry: Date.now() + expires_in * 1000,
        bnetConnected: true,
      },
    },
    {}
  )

  await charactersDb.removeAsync({ userId: session.userId }, { multi: true })

  const accounts = charsData.wow_accounts ?? []
  const rawChars = accounts.flatMap((acc) => acc.characters ?? [])

  for (const char of rawChars) {
    const doc: Omit<BnetCharacter, '_id'> = {
      userId: session.userId,
      name: char.name,
      realm: char.realm?.name ?? '',
      realmSlug: char.realm?.slug ?? '',
      classId: char.playable_class?.id ?? 0,
      className: char.playable_class?.name ?? '',
      raceId: char.playable_race?.id ?? 0,
      raceName: char.playable_race?.name ?? '',
      level: char.level ?? 0,
      faction: char.faction?.type === 'HORDE' ? 'horde' : 'alliance',
      fetchedAt: new Date().toISOString(),
    }
    await charactersDb.insertAsync(doc)
  }

  return NextResponse.redirect(new URL('/profil', req.url))
}
