import mongoose, { Schema } from 'mongoose'

const CACHE_TTL_SECONDS = 7 * 24 * 3600 // 7 days: Blizzard static data only changes with a patch

/** Generic cache of Blizzard static data, one document per `key` (e.g. `recipe:12345`). */
export interface BnetCacheDoc {
	key: string
	data: unknown // already mapped to what the caller serves
	expiresAt: Date
}

const bnetCacheSchema = new Schema<BnetCacheDoc>(
	{
		key: { type: String, required: true, unique: true },
		data: Schema.Types.Mixed,
		expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
	},
	{ versionKey: false },
)

export const BnetCacheModel =
	(mongoose.models.BnetCache as mongoose.Model<BnetCacheDoc>) ??
	mongoose.model<BnetCacheDoc>('BnetCache', bnetCacheSchema)

export function makeBnetExpiry(ttlMs = CACHE_TTL_SECONDS * 1000): Date {
	return new Date(Date.now() + ttlMs)
}
