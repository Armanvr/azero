import mongoose, { Schema } from 'mongoose'
import type { Difficulty, ItemSource } from '@/lib/types'

const CACHE_TTL_SECONDS = 7 * 24 * 3600 // 7 days — item data rarely changes mid-patch

export interface ItemCacheDoc {
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
		boss: String,
		instance: String,
		difficulty: String,
		ilvlRange: String,
		dropRate: String,
	},
	{ _id: false },
)

const itemCacheSchema = new Schema<ItemCacheDoc>(
	{
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

// Blizzard difficulty type → Difficulty label
export const BNET_DIFF_LABELS: Record<string, Difficulty> = {
	LFR: 'LFR',
	NORMAL: 'Normal',
	HEROIC: 'Heroïque',
	MYTHIC: 'Mythique',
}
