'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'

const RESEARCHER_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/articles',  label: 'Articles' },
  { href: '/insights',  label: 'Insights' },
  { href: '/digest',    label: 'Digest' },
]

const READER_LINKS = [
  { href: '/digest', label: 'Digest' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role, setRole } = useStore()

  const links = role === 'researcher' ? RESEARCHER_LINKS : READER_LINKS

  return (
    <aside className="w-56 shrink-0 border-r border-[#00e05a33] bg-[#0a0a0a] flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-[#00e05a22]">
        <p className="text-xs font-semibold text-[#006025] uppercase tracking-wider">Signal Digest</p>
        <p className="text-sm font-medium text-[#00e05a] mt-0.5">AI Adoption</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-[#0f1a12] text-[#00e05a] font-medium border border-[#00e05a33]'
                  : 'text-[#00a040] hover:bg-[#0f1a12] hover:text-[#00e05a]'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#00e05a22]">
        <p className="text-xs text-[#006025] mb-2">Role</p>
        <div className="flex gap-1">
          {(['researcher', 'reader'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-1 rounded text-xs font-medium transition-colors capitalize ${
                role === r
                  ? 'bg-[#00e05a] text-[#0a0a0a]'
                  : 'bg-[#0f1a12] border border-[#00e05a22] text-[#00a040] hover:border-[#00e05a44]'
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
