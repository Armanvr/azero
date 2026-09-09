/**
 * Shared BNet client credentials token.
 * Module-level singleton — persists across requests within a Next.js server instance.
 * Does NOT require user auth — fetches public data.
 */

const TOKEN_URL = 'https://oauth.battle.net/token'

interface TokenCache {
	value: string
	expiresAt: number
}

let tokenCache: TokenCache | null = null

export async function getBnetClientToken(): Promise<string | null> {
	if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
		return tokenCache.value
	}

	const clientId = process.env.BNET_CLIENT_ID
	const clientSecret = process.env.BNET_CLIENT_SECRET
	if (!clientId || !clientSecret) return null

	const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${credentials}`,
		},
		body: 'grant_type=client_credentials',
	})

	if (!res.ok) return null

	const { access_token, expires_in } = (await res.json()) as {
		access_token: string
		expires_in: number
	}

	tokenCache = { value: access_token, expiresAt: Date.now() + expires_in * 1000 }
	return access_token
}

export async function bnetFetch(url: string, token: string): Promise<unknown> {
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
	if (!res.ok) return null
	return res.json()
}
