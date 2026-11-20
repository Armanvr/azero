// In-memory stand-in for lib/db.ts (users, characters, public search cache). Mirrors Mongo filter semantics for flat equality.
type Doc = Record<string, unknown>

export const store: Doc[] = []

const matches = (d: Doc, filter: Doc) => Object.entries(filter).every(([k, v]) => d[k] === v)

/** Flip `down` to make connectDB reject, like an unreachable Mongo. */
export const dbState = { down: false }

export async function connectDB() {
	if (dbState.down) throw new Error('mongo down')
}

export const UserModel = {
	findOne: (filter: Doc) => ({
		lean: async () => {
			const d = store.find((x) => matches(x, filter))
			return d ? structuredClone(d) : null
		},
	}),
	create: async (doc: Doc) => {
		if (store.some((x) => x.email === doc.email || x.id === doc.id)) throw new Error('E11000 duplicate key')
		store.push(structuredClone(doc))
	},
	updateOne: async (filter: Doc, update: { $set?: Doc; $unset?: Doc }, options?: Doc) => {
		userUpdates.push({ update: structuredClone(update), options })
		const d = store.find((x) => matches(x, filter))
		if (d) {
			Object.assign(d, update.$set)
			for (const k of Object.keys(update.$unset ?? {})) delete d[k]
		}
		return { matchedCount: d ? 1 : 0 }
	},
}
export const userUpdates: Array<{ update: { $set?: Doc; $unset?: Doc }; options?: Doc }> = []

export const characters: Doc[] = []

type Cond = unknown
const matchesCond = (actual: unknown, cond: Cond) => {
	if (cond && typeof cond === 'object' && '$regex' in cond) {
		const c = cond as { $regex: string; $options?: string }
		return typeof actual === 'string' && new RegExp(c.$regex, c.$options).test(actual)
	}
	return actual === cond
}

export const CharacterModel = {
	findOne: (filter: Doc) => ({
		lean: async () => {
			const d = characters.find((x) => Object.entries(filter).every(([k, v]) => matchesCond(x[k], v)))
			return d ? structuredClone(d) : null
		},
	}),
}

// --- Characters: list / update (professions route) ---
const findChars = (filter: Doc) =>
	characters.filter((x) => Object.entries(filter).every(([k, v]) => matchesCond(x[k], v)))
Object.assign(CharacterModel, {
	find: (filter: Doc) => ({ lean: async () => findChars(filter).map((d) => structuredClone(d)) }),
	updateOne: async (filter: Doc, update: { $set: Doc }) => {
		updates.push({ filter, set: structuredClone(update.$set) })
		const d = findChars(filter)[0]
		if (d) Object.assign(d, update.$set)
		return { matchedCount: d ? 1 : 0 }
	},
	deleteMany: async (filter: Doc) => {
		for (const d of findChars(filter)) characters.splice(characters.indexOf(d), 1)
	},
	insertMany: async (docs: Doc[]) => void characters.push(...structuredClone(docs)),
})
export const updates: Array<{ filter: Doc; set: Doc }> = []

// --- Public search cache ---
export const searchCache: Doc[] = []
export const makeExpiry = (ttlMs = 3600_000) => new Date(Date.now() + ttlMs)
export const SearchCacheModel = {
	findOne: (filter: { realm: string; name: string; region: string; expiresAt: { $gt: Date } }) => ({
		lean: async () => {
			const d = searchCache.find(
				(x) =>
					x.realm === filter.realm &&
					x.name === filter.name &&
					x.region === filter.region &&
					(x.expiresAt as Date) > filter.expiresAt.$gt,
			)
			return d ? structuredClone(d) : null
		},
	}),
	findOneAndUpdate: async (filter: Doc, update: { $set: Doc }) => {
		const i = searchCache.findIndex(
			(x) => x.realm === filter.realm && x.name === filter.name && x.region === filter.region,
		)
		const doc = { ...filter, ...structuredClone(update.$set) }
		if (i === -1) searchCache.push(doc)
		else searchCache[i] = doc
		return doc
	},
}

// --- Blizzard static data cache (lib/models/BnetCache.ts, routed here by hooks.mjs) ---
export const bnetCache: Doc[] = []
export const makeBnetExpiry = (ttlMs = 7 * 24 * 3600_000) => new Date(Date.now() + ttlMs)
export const BnetCacheModel = {
	findOne: (filter: { key: string; expiresAt: { $gt: Date } }) => ({
		lean: async () => {
			const d = bnetCache.find((x) => x.key === filter.key && (x.expiresAt as Date) > filter.expiresAt.$gt)
			return d ? structuredClone(d) : null
		},
	}),
	updateOne: async (filter: { key: string }, update: { $set: Doc }) => {
		const doc = { ...filter, ...structuredClone(update.$set) }
		const i = bnetCache.findIndex((x) => x.key === filter.key)
		if (i === -1) bnetCache.push(doc)
		else bnetCache[i] = doc
		return { matchedCount: i === -1 ? 0 : 1 }
	},
}
