// Placeholder data until real weekly tracking exists (taken from the mockup).

export const OBJECTIVES = [
	{ label: 'Terminer 8 donjons mythiques', cur: 3, max: 8, done: false },
	{ label: 'Vaincre le boss de raid hebdomadaire', cur: 0, max: 1, done: false },
	{ label: 'Compléter les quêtes hebdomadaires', cur: 3, max: 3, done: true },
	{ label: 'Atteindre le plafond de réputation', cur: 1, max: 1, done: true },
	{ label: 'Récupérer la récompense JcJ', cur: 0, max: 1, done: false },
]

export const TRACKING = [
	{
		name: 'Aldric Lumeval',
		cls: 'Paladin 80',
		chips: [
			{ label: 'Donjons', done: false },
			{ label: 'Quêtes hebdo', done: true },
			{ label: 'Réputation', done: true },
		],
	},
	{
		name: 'Ysolde Brumeval',
		cls: 'Druide 80',
		chips: [
			{ label: 'Donjons', done: true },
			{ label: 'Raid', done: false },
			{ label: 'Réputation', done: false },
		],
	},
	{
		name: 'Bram Forgefer',
		cls: 'Chaman 80',
		chips: [
			{ label: 'Donjons', done: true },
			{ label: 'Raid', done: true },
			{ label: 'Quêtes hebdo', done: true },
		],
	},
]

export const ALERTS = [
	{ title: 'Boss de raid non vaincu', detail: 'Aldric · verrouillage actif', tone: 'red' },
	{ title: '2 crafts importants prêts', detail: 'Forge, Alchimie', tone: 'green' },
] as const

export const COOLDOWNS = [
	{ name: 'Transmutation', status: 'Prêt', ready: true },
	{ name: "Pierre d'ingénierie", status: '1 h 23 min', ready: false },
	{ name: 'Lingot renforcé', status: '3 h 47 min', ready: false },
]
