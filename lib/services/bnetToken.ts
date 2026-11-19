/**
 * Shared BNet client credentials token.
 * Module-level singleton — persists across requests within a Next.js server instance.
 * Does NOT require user auth — fetches public data.
 */

const TOKEN_URL = 'https://oauth.battle.net/token'
export const EU_BASE = 'https://eu.api.blizzard.com'
const TIMEOUT_MS = 8000
// Status reported for a network error or a timeout: it is an upstream failure, like a 5xx
const NETWORK_FAILURE = 504

interface TokenCache {
	value: string
	expiresAt: number
}

let tokenCache: TokenCache | null = null
// Concurrent callers share one token request (the public route fires several calls at once)
let pendingToken: Promise<string | null> | null = null

async function requestToken(): Promise<string | null> {
	const clientId = process.env.BNET_CLIENT_ID
	const clientSecret = process.env.BNET_CLIENT_SECRET
	if (!clientId || !clientSecret) return null

	const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
	try {
		const res = await fetch(TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${credentials}`,
			},
			body: 'grant_type=client_credentials',
			signal: AbortSignal.timeout(TIMEOUT_MS),
		})
		if (!res.ok) {
			console.error('bnet', res.status, new URL(TOKEN_URL).pathname)
			return null
		}
		const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number }
		tokenCache = { value: access_token, expiresAt: Date.now() + expires_in * 1000 }
		return access_token
	} catch {
		console.error('bnet', NETWORK_FAILURE, new URL(TOKEN_URL).pathname)
		return null
	}
}

export async function getBnetClientToken(): Promise<string | null> {
	if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
		return tokenCache.value
	}
	pendingToken ??= requestToken().finally(() => {
		pendingToken = null
	})
	return pendingToken
}

/** `data` is untyped on purpose: callers read the few Blizzard fields they need with optional chaining. */
export interface BnetResult {
	status: number
	// biome-ignore lint/suspicious/noExplicitAny: see above
	data: any
}

async function bnetRequest(url: string, token: string): Promise<BnetResult> {
	try {
		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		})
		return { status: res.status, data: res.ok ? await res.json() : null }
	} catch {
		return { status: NETWORK_FAILURE, data: null }
	}
}

/**
 * GET a Blizzard API URL. Never throws: `status` is the HTTP status (504 for a network error or a timeout),
 * `data` the parsed body on success, null otherwise. A cached client token that Blizzard rejects (401) is
 * dropped and the call retried once with a fresh one.
 */
export async function bnetGet(url: string, token: string): Promise<BnetResult> {
	let result = await bnetRequest(url, token)
	if (result.status === 401) {
		if (tokenCache?.value === token) tokenCache = null
		const fresh = await getBnetClientToken()
		if (fresh && fresh !== token) result = await bnetRequest(url, fresh)
	}
	// Log the status and the URL path only: never the token, the credentials or the query
	if (result.status !== 404 && !(result.status >= 200 && result.status < 300)) {
		console.error('bnet', result.status, new URL(url).pathname)
	}
	return result
}

export async function bnetFetch(url: string, token: string) {
	return (await bnetGet(url, token)).data
}
