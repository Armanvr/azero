import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
	const session = await readSession()
	if (!session) return NextResponse.redirect(new URL('/auth', req.url))

	const clientId = process.env.BNET_CLIENT_ID
	const redirectUri = process.env.BNET_REDIRECT_URI
	if (!clientId || !redirectUri) {
		return NextResponse.redirect(new URL('/profil?error=bnet_not_configured', req.url))
	}

	const state = crypto.randomUUID()
	;(await cookies()).set('bnet_oauth_state', state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		path: '/',
		maxAge: 600,
	})

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'wow.profile',
		state,
	})

	return NextResponse.redirect(`https://oauth.battle.net/authorize?${params.toString()}`)
}
