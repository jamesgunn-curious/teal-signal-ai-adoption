'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavCounts {
  pipeline: number
  curate:   number
}

const TABS = [
  { href: '/pipeline',   label: 'Pipeline',   countKey: 'pipeline' as const },
  { href: '/insights',   label: 'Review',     countKey: 'curate'   as const },
  { href: '/narratives', label: 'Narratives', countKey: null },
  { href: '/digest',     label: 'Digest',     countKey: null },
]

export function TopNav({ counts }: { counts?: NavCounts }) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-20 border-b border-[#00e05a22] bg-[#0a0a0a]">
      <div className="flex items-stretch h-11">

        {/* Brand — compact, fixed */}
        <Link
          href="/pipeline"
          className="flex items-center gap-2 px-4 shrink-0 border-r border-[#00e05a22] hover:bg-[#0f1a12] transition-colors"
        >
          <div className="w-5 h-5 rounded-full border border-[#00e05a] flex items-center justify-center shrink-0">
            <span className="text-[#00e05a] text-[9px] font-bold leading-none">S</span>
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold text-[#00e05a] leading-none">Signal Digest</div>
            <div className="text-[9px] text-[#006025] leading-none mt-0.5">ai adoption</div>
          </div>
        </Link>

        {/* Tabs — equal width, fill remaining space */}
        <nav className="flex flex-1">
          {TABS.map(({ href, label, countKey }) => {
            const active = isActive(href)
            const count = countKey ? (counts?.[countKey] ?? 0) : 0
            const showBadge = count > 0

            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors border-b-2 ${
                  active
                    ? 'border-[#00e05a] text-[#00e05a] bg-[#0f1a12]'
                    : 'border-transparent text-[#007830] hover:text-[#00c050] hover:bg-[#0a0a0a]'
                }`}
              >
                <span>{label}</span>
                {showBadge && (
                  <span className={`text-[9px] font-semibold px-1 py-0.5 rounded leading-none ${
                    active ? 'bg-[#00e05a] text-[#0a0a0a]' : 'bg-[#0f1a12] border border-[#00e05a33] text-[#00a040]'
                  }`}>
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

      </div>
    </header>
  )
}
