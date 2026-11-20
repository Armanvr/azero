import type { ItemRarity, WowClass } from './types'

export const RARITY_LABELS: Record<ItemRarity, string> = {
	legendary: 'Légendaire',
	epic: 'Épique',
	rare: 'Rare',
	uncommon: 'Inhabituel',
	common: 'Commun',
}

// Token references: the stylesheets own the actual colours
export const RARITY_COLORS: Record<ItemRarity, string> = {
	legendary: 'var(--rarity-legendary)',
	epic: 'var(--rarity-epic)',
	rare: 'var(--rarity-rare)',
	uncommon: 'var(--green)',
	common: 'var(--text-dim)',
}

export const CLASS_ID_TO_NAME: Record<number, WowClass> = {
	1: 'Guerrier',
	2: 'Paladin',
	3: 'Chasseur',
	4: 'Voleur',
	5: 'Prêtre',
	6: 'Chevalier de la mort',
	7: 'Chaman',
	8: 'Mage',
	9: 'Démoniste',
	10: 'Moine',
	11: 'Druide',
	12: 'Chasseur de démons',
	13: 'Evocateur',
}

// By Blizzard class id, official palette
export const CLASS_COLORS: Record<number, string> = {
	1: '#C69B6D',
	2: '#F48CBA',
	3: '#AAD372',
	4: '#FFF468',
	5: '#FFFFFF',
	6: '#C41E3A',
	7: '#0070DD',
	8: '#3FC7EB',
	9: '#8788EE',
	10: '#00FF98',
	11: '#FF7C0A',
	12: '#A330C9',
	13: '#33937F',
}
