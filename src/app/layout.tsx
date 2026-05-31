import type { Metadata } from 'next'
import './globals.css'
import { NavWrapper } from '@/components/nav/nav-wrapper'

export const metadata: Metadata = {
  title: 'Signal Digest — AI Adoption',
  description: 'AI adoption research pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Figtree via Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased" style={{fontFamily:"'Figtree',sans-serif"}}>
        <div className="flex flex-col min-h-screen">
          <NavWrapper />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  )
}
