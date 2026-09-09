import mongoose, { Schema } from 'mongoose'
import type { User } from '@/lib/types'

const userSchema = new Schema<User>(
	{
		id: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		username: { type: String, required: true },
		passwordHash: { type: String, required: true },
		createdAt: { type: String, required: true },
		bnetAccessToken: String,
		bnetTokenExpiry: Number,
		bnetConnected: Boolean,
		favoriteCharId: String,
		subFavoriteCharIds: [String],
	},
	{ versionKey: false },
)

export const UserModel = (mongoose.models.User as mongoose.Model<User>) ?? mongoose.model<User>('User', userSchema)
