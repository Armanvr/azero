import mongoose, { Schema } from 'mongoose'
import type { BnetCharacter } from '@/lib/types'

const equippedItemSchema = new Schema(
	{
		id: String,
		label: String,
		item: String,
		itemId: Number,
		ilvl: Number,
		enchant: Schema.Types.Mixed,
		rarity: String,
		iconUrl: String,
	},
	{ _id: false },
)

const professionSchema = new Schema({ name: String, tier: Number, skill: Number, max: Number }, { _id: false })

const characterSchema = new Schema<BnetCharacter>(
	{
		userId: { type: String, required: true, index: true },
		name: { type: String, required: true },
		realm: String,
		realmSlug: String,
		classId: Number,
		className: String,
		raceId: Number,
		raceName: String,
		level: Number,
		faction: String,
		fetchedAt: String,
		avatarUrl: String,
		ilvl: Number,
		spec: String,
		specId: Number,
		title: String,
		guildName: String,
		gold: Number,
		slotsLeft: [equippedItemSchema],
		slotsRight: [equippedItemSchema],
		slotsWeapon: [equippedItemSchema],
		enrichedAt: String,
		professions: [professionSchema],
		professionsFetchedAt: Number,
	},
	{ versionKey: false },
)

export const CharacterModel =
	(mongoose.models.Character as mongoose.Model<BnetCharacter>) ??
	mongoose.model<BnetCharacter>('Character', characterSchema)
