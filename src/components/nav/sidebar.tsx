'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'

const NAV_GROUPS = [
  {
    label: 'Workflow',
    links: [
      { href: '/dashboard', label: 'Sources' },
      { href: '/gather',    label: 'Gather' },
      { href: '/articles',  label: 'Article queue' },
      { href: '/insights',  label: 'Curate' },
    ],
  },
  {
    label: 'Output',
    links: [
      { href: '/digest',    label: 'Digest' },
      { href: '/trends',    label: 'Trends' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role, setRole } = useStore()

  const visibleGroups = role === 'researcher'
    ? NAV_GROUPS
    : NAV_GROUPS.filter(g => g.label === 'Output')

  return (
    <aside className="w-52 shrink-0 border-r border-[#00e05a22] bg-[#0a0a0a] flex flex-col h-screen sticky top-0">

      {/* Brand cluster */}
      <div className="px-4 pt-5 pb-4 border-b border-[#00e05a22]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00e05a] flex items-center justify-center shrink-0">
            <span className="text-[#00e05a] text-sm font-bold leading-none">S</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#00e05a] leading-tight">Signal Digest</div>
            <div className="text-[10px] text-[#006025] leading-tight mt-0.5">ai adoption</div>
          </div>
        </div>

        {/* Role toggle — inline in brand cluster */}
        <div className="flex gap-1">
          {(['researcher', 'reader'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors capitalize ${
                role === r
                  ? 'bg-[#00e05a] text-[#0a0a0a]'
                  : 'bg-[#0f1a12] border border-[#00e05a22] text-[#006025] hover:text-[#00a040] hover:border-[#00e05a44]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {visibleGroups.map(group => (
          <div key={group.label}>
            <div className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#006025]">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.links.map(({ href, label }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                      active
                        ? 'bg-[#0f1a12] text-[#00e05a] font-medium border border-[#00e05a33]'
                        : 'text-[#007830] hover:bg-[#0f1a12] hover:text-[#00c050]'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  )
}
