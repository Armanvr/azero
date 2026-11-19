'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { ProfessionCharacter } from '@/lib/types'

/** GET /api/professions with the loading / error states and the 401 → /auth redirect shared by both pages. */
export function useProfessionCharacters() {
	const router = useRouter()
	const [characters, setCharacters] = useState<ProfessionCharacter[] | null>(null)
	const [error, setError] = useState(false)

	const load = useCallback(async () => {
		setError(false)
		setCharacters(null)
		try {
			const res = await fetch('/api/professions')
			if (res.status === 401) return router.replace('/auth')
			if (!res.ok) throw new Error()
			setCharacters((await res.json()).characters)
		} catch {
			setError(true)
		}
	}, [router])

	useEffect(() => {
		load()
	}, [load])

	return { characters, error, load }
}
