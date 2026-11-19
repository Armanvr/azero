// Scripted replacement for globalThis.fetch: no test ever reaches the network.
type Reply = { status?: number; body?: unknown } | Error
type Route = { match: RegExp; reply: Reply | (() => Reply | Promise<Reply>) }

export const calls: string[] = []
export let maxInFlight = 0
let inFlight = 0
const realFetch = globalThis.fetch

/** Routes are tried in order; an unmatched URL fails the test loudly (404 would hide a wrong URL). */
export function mockFetch(routes: Route[]) {
	calls.length = 0
	maxInFlight = 0
	inFlight = 0
	globalThis.fetch = (async (input: unknown) => {
		const url = String(input)
		calls.push(url)
		inFlight++
		maxInFlight = Math.max(maxInFlight, inFlight)
		try {
			await new Promise((r) => setImmediate(r))
			const route = routes.find((r) => r.match.test(url))
			if (!route) throw new Error(`Unexpected fetch in test: ${url}`)
			const reply = typeof route.reply === 'function' ? await route.reply() : route.reply
			if (reply instanceof Error) throw reply
			const status = reply.status ?? 200
			// A string body is sent as is (Wowhead answers XML)
			return new Response(typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body ?? {}), {
				status,
				headers: { 'content-type': 'application/json' },
			})
		} finally {
			inFlight--
		}
	}) as typeof fetch
}

export function restoreFetch() {
	globalThis.fetch = realFetch
}

export const tokenRoute: Route = {
	match: /oauth\.battle\.net\/token/,
	reply: { body: { access_token: 'tok', expires_in: 86400 } },
}
