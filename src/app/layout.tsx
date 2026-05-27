import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/nav/sidebar'

export const metadata: Metadata = {
  title: 'Signal Digest — AI Adoption',
  description: 'AI adoption research pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Droid Sans (headings) + Droid Serif (body) via Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Droid+Sans:wght@400;700&family=Droid+Serif:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-neutral-50 text-neutral-900 antialiased font-serif">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  )
}
