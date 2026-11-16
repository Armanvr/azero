import mongoose, { Schema } from 'mongoose'
import type { Character } from '@/lib/types'

const CACHE_TTL_SECONDS = 3600 // 1 hour

export interface SearchCacheDoc {
	realm: string // realm slug, lowercase
	name: string // character name, lowercase
	region: string
	character?: Character | null // null = Blizzard answered 404 (negative cache)
	fetchedAt: Date
	expiresAt: Date
}

const searchCacheSchema = new Schema<SearchCacheDoc>(
	{
		realm: { type: String, required: true },
		name: { type: String, required: true },
		region: { type: String, required: true, default: 'eu' },
		character: { type: Schema.Types.Mixed, default: null },
		fetchedAt: { type: Date, required: true },
		expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
	},
	{ versionKey: false },
)

// Compound index for fast lookup + uniqueness
searchCacheSchema.index({ realm: 1, name: 1, region: 1 }, { unique: true })

export const SearchCacheModel =
	(mongoose.models.SearchCache as mongoose.Model<SearchCacheDoc>) ??
	mongoose.model<SearchCacheDoc>('SearchCache', searchCacheSchema)

export function makeExpiry(ttlMs = CACHE_TTL_SECONDS * 1000): Date {
	return new Date(Date.now() + ttlMs)
}
