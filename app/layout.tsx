import type { Metadata } from 'next'
import { Cinzel, Figtree } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-cinzel' })
const figtree = Figtree({
	subsets: ['latin'],
	weight: ['400', '500', '600'],
	variable: '--font-figtree',
})

export const metadata: Metadata = {
	title: 'Azero — Armory Dashboard',
	description: 'Dashboard Armory pour World of Warcraft',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='fr' className={`${cinzel.variable} ${figtree.variable}`}>
			<body>{children}</body>
		</html>
	)
}
