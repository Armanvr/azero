'use client'
import Image from 'next/image'
import { useState } from 'react'
import type { Character } from '@/lib/types'
import styles from './CharAvatar.module.css'

// Renders nothing when there is no usable avatar: the caller shows its own empty frame
export default function CharAvatar({ character }: { character: Character }) {
	const [imgError, setImgError] = useState(false)
	if (!character.avatarUrl || imgError) return null
	return (
		<Image
			src={character.avatarUrl}
			alt={character.name}
			width={160}
			height={160}
			onError={() => setImgError(true)}
			className={styles.photo}
		/>
	)
}
