'use client'

import { type FC } from 'react'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error' | 'loading'
  label: string
  className?: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const statusConfig = {
    active: {
      icon: CheckCircle,
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/50',
      textColor: 'text-green-300',
      animationClass: 'animate-status-ping',
    },
    inactive: {
      icon: AlertCircle,
      bgColor: 'bg-muted/30',
      borderColor: 'border-border',
      textColor: 'text-muted-foreground',
      animationClass: '',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-destructive/20',
      borderColor: 'border-destructive/50',
      textColor: 'text-destructive',
      animationClass: '',
    },
    loading: {
      icon: Loader2,
      bgColor: 'bg-primary/20',
      borderColor: 'border-primary/50',
      textColor: 'text-primary',
      animationClass: 'animate-agent-pulse',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium touch-target ${config.bgColor} ${config.borderColor} ${config.textColor} ${className}`}
      role="status"
      aria-live="polite"
    >
      <Icon
        size={16}
        className={status === 'loading' ? 'animate-spin' : config.animationClass}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}
