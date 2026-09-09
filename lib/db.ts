import mongoose from 'mongoose'

declare global {
	// eslint-disable-next-line no-var
	var __mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined
}

const cached = global.__mongoose ?? { conn: null, promise: null }
global.__mongoose = cached

export async function connectDB(): Promise<typeof mongoose> {
	if (cached.conn) return cached.conn

	const MONGODB_URI = process.env.MONGODB_URI
	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is not defined. See .env.local.example.')
	}

	if (!cached.promise) {
		cached.promise = mongoose.connect(MONGODB_URI, {
			bufferCommands: false,
		})
	}

	cached.conn = await cached.promise
	return cached.conn
}

export { CharacterModel } from '@/lib/models/Character'
export { ItemCacheModel, makeItemExpiry } from '@/lib/models/ItemCache'
export { makeExpiry, SearchCacheModel } from '@/lib/models/SearchCache'
export { UserModel } from '@/lib/models/User'
