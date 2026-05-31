import Link from 'next/link'

interface Stat {
  n: number | string
  label: string
  accent?: boolean
}

interface PageHeaderProps {
  crumbs: [string, string]
  stats?: Stat[]
  actions?: React.ReactNode
  back?: { label: string; href: string }
}

export function PageHeader({ crumbs, stats = [], actions, back }: PageHeaderProps) {
  const [group, screen] = crumbs
  return (
    <div className="flex items-start justify-between gap-6 mb-8 pt-8 px-8 border-b border-[#00e05a15] pb-5">
      <div>
        {back && (
          <Link href={back.href} className="text-xs text-[#006025] hover:text-[#00a040] mb-1 block">
            ← {back.label}
          </Link>
        )}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#006025]">{group}</span>
          <span className="text-[#006025] text-[10px]">/</span>
          <span className="text-sm font-semibold text-[#00e05a]">{screen}</span>
        </div>
        {stats.length > 0 && (
          <div className="flex items-center gap-4">
            {stats.map(({ n, label, accent }) => (
              <div key={label} className="flex items-baseline gap-1">
                <span className={`text-lg font-semibold tabular-nums leading-none ${accent ? 'text-[#00e05a]' : 'text-[#007830]'}`}>
                  {n}
                </span>
                <span className="text-[10px] text-[#006025] uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {actions}
        </div>
      )}
    </div>
  )
}
