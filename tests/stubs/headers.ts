const jar = new Map<string, string>()
const options = new Map<string, Record<string, unknown> | undefined>()

export const cookieJar = jar
/** Options passed to `cookies().set`, by cookie name (maxAge, httpOnly, ...). */
export const cookieOptions = options

export async function cookies() {
	return {
		get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) as string } : undefined),
		set: (name: string, value: string, opts?: Record<string, unknown>) => {
			jar.set(name, value)
			options.set(name, opts)
		},
		delete: (name: string) => {
			jar.delete(name)
			options.delete(name)
		},
	}
}
