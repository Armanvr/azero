import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await readSession()
  if (!session) return NextResponse.redirect(new URL('/auth', req.url))

  const params = new URLSearchParams({
    client_id: process.env.BNET_CLIENT_ID!,
    redirect_uri: process.env.BNET_REDIRECT_URI!,
    response_type: 'code',
    scope: 'wow.profile',
  })

  return NextResponse.redirect(`https://oauth.battle.net/authorize?${params.toString()}`)
}
