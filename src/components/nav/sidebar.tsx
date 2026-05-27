'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'

const RESEARCHER_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/articles', label: 'Articles' },
  { href: '/insights', label: 'Insights' },
  { href: '/digest', label: 'Digest' },
]

const READER_LINKS = [
  { href: '/digest', label: 'Digest' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role, setRole } = useStore()

  const links = role === 'researcher' ? RESEARCHER_LINKS : READER_LINKS

  return (
    <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-neutral-200">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Signal Digest</p>
        <p className="text-sm font-medium text-neutral-700 mt-0.5">AI Adoption</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-neutral-100 text-neutral-900 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-neutral-200">
        <p className="text-xs text-neutral-400 mb-2">Role</p>
        <div className="flex gap-1">
          {(['researcher', 'reader'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-1 rounded text-xs font-medium transition-colors capitalize ${
                role === r
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
