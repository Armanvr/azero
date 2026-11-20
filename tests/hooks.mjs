import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)
const stub = (name) => new URL(`./stubs/${name}`, import.meta.url).href

export async function resolve(specifier, context, nextResolve) {
	if (specifier === 'next/headers') return { url: stub('headers.ts'), shortCircuit: true }
	if (specifier === 'next/server') return nextResolve('next/server.js', context)

	let target = specifier
	if (specifier.startsWith('@/')) target = new URL(specifier.slice(2), root).href
	else if (specifier.startsWith('.') && context.parentURL) target = new URL(specifier, context.parentURL).href
	else return nextResolve(specifier, context)

	const base = fileURLToPath(target)
	const file = [base, `${base}.ts`, `${base}/index.ts`].find((p) => existsSync(p) && /\.ts$/.test(p))
	if (!file) return nextResolve(specifier, context)
	const url = pathToFileURL(file).href
	if (url.endsWith('/lib/db.ts') || url.endsWith('/lib/models/BnetCache.ts'))
		return { url: stub('db.ts'), shortCircuit: true }
	return { url, shortCircuit: true }
}
