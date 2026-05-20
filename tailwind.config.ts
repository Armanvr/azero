import type { Config } from 'tailwindcss'

const config: Config = {
	content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
	theme: {
		extend: {
			colors: {
				bg: 'var(--bg)',
				surface: 'var(--surface)',
				surface2: 'var(--surface2)',
				surface3: 'var(--surface3)',
				border: 'var(--border)',
				border2: 'var(--border2)',
				gold: 'var(--gold)',
				'gold-light': 'var(--gold-light)',
				'gold-dim': 'var(--gold-dim)',
				purple: 'var(--purple)',
				'purple-dim': 'var(--purple-dim)',
				blue: 'var(--blue)',
				green: 'var(--green)',
				red: 'var(--red)',
				text: 'var(--text)',
				'text-dim': 'var(--text-dim)',
				'text-muted': 'var(--text-muted)',
			},
			fontFamily: {
				rajdhani: ['Rajdhani', 'sans-serif'],
				exo: ["'Exo 2'", 'sans-serif'],
			},
		},
	},
	plugins: [],
}

export default config
