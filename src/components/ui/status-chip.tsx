import { getStatusToken } from '@/lib/status-tokens'

interface StatusChipProps {
  status: string
  label?: string
  className?: string
}

export function StatusChip({ status, label, className = '' }: StatusChipProps) {
  const token = getStatusToken(status)
  return (
    <span className={`status-chip ${token.className} ${className}`}>
      {label ?? token.label}
    </span>
  )
}
