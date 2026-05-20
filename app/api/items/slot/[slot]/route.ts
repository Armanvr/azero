import { NextResponse } from 'next/server'

// Obtainable items by slot — data source removed (was mock).
// Returns empty list until real data source is implemented.
export async function GET() {
	return NextResponse.json({ items: [] })
}
