import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'Azero — Armory Dashboard',
	description: 'Dashboard Armory pour World of Warcraft',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='fr'>
			<head>
				<link rel='preconnect' href='https://fonts.googleapis.com' />
				<link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
				<link
					href='https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap'
					rel='stylesheet'
				/>
			</head>
			<body>{children}</body>
		</html>
	)
}
