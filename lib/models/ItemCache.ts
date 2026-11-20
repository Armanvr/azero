import mongoose, { Schema } from 'mongoose'
import type { ItemSource } from '@/lib/types'

const CACHE_TTL_SECONDS = 7 * 24 * 3600 // 7 days — item data rarely changes mid-patch

/** Bump when the stored content changes: older documents (no `v` for the first shape, 2 had the « Raids » LFR label) are never read. */
export const ITEM_CACHE_VERSION = 3

export interface ItemCacheDoc {
	v: number
	itemId: number
	name: string
	type: string // "Armure", "Arme", "Bijou"…
	slot: string // "Tête", "Torse"…
	stats: string[] // ["520 Endurance", "432 Intelligence"]
	sources: ItemSource[]
	fetchedAt: Date
	expiresAt: Date
}

const itemSourceSchema = new Schema(
	{
		// `type` as a path name needs the nested form, or Mongoose reads it as the schema type
		type: { type: String, required: true },
		name: { type: String, required: true },
		instance: String,
		expansion: String,
		difficulties: [String],
		conditions: String,
	},
	{ _id: false },
)

const itemCacheSchema = new Schema<ItemCacheDoc>(
	{
		v: { type: Number, required: true },
		itemId: { type: Number, required: true, unique: true, index: true },
		name: String,
		type: String,
		slot: String,
		stats: [String],
		sources: [itemSourceSchema],
		fetchedAt: { type: Date, required: true },
		expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
	},
	{ versionKey: false },
)

export const ItemCacheModel =
	(mongoose.models.ItemCache as mongoose.Model<ItemCacheDoc>) ??
	mongoose.model<ItemCacheDoc>('ItemCache', itemCacheSchema)

export function makeItemExpiry(): Date {
	return new Date(Date.now() + CACHE_TTL_SECONDS * 1000)
}

// Blizzard stat type → French label
export const BNET_STAT_LABELS: Record<string, string> = {
	STAMINA: 'Endurance',
	INTELLECT: 'Intelligence',
	STRENGTH: 'Force',
	AGILITY: 'Agilité',
	SPIRIT: 'Esprit',
	CRITICAL_STRIKE: 'Coup critique',
	HASTE: 'Hâte',
	MASTERY: 'Maîtrise',
	VERSATILITY: 'Polyvalence',
	ARMOR: 'Armure',
	CORRUPTION: 'Corruption',
	AVOIDANCE: 'Esquive',
	LEECH: 'Absorption vitale',
	SPEED: 'Vitesse de déplacement',
}
