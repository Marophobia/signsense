import { type FC } from 'react'
import { type PipelineStatus } from '@/hooks/use-sign-sense'
import { Camera, Zap, FileText } from 'lucide-react'
import { StatusBadge } from './status-badge'

interface PipelineStatusProps {
  status: PipelineStatus
  className?: string
}

const iconMap = {
  camera: Camera,
  gesture: Zap,
  transcript: FileText,
} as const

const statusMap = {
  connected: 'active',
  disconnected: 'inactive',
  processing: 'loading',
  ready: 'inactive',
  error: 'error',
} as const

export const PipelineStatusComponent: FC<PipelineStatusProps> = ({ status, className = '' }) => {
  const stages = [
    { key: 'camera' as const, label: 'Camera', icon: iconMap.camera },
    { key: 'gesture' as const, label: 'Gesture AI', icon: iconMap.gesture },
    { key: 'transcript' as const, label: 'Transcript', icon: iconMap.transcript },
  ]

  return (
    <div className={`glass p-4 rounded-lg ${className}`}>
      <h3 className="font-syne font-semibold text-sm mb-4">Pipeline Status</h3>

      <div className="space-y-3">
        {stages.map((stage) => {
          const stageStatus = status[stage.key]
          const badgeStatus = statusMap[stageStatus as keyof typeof statusMap]
          const Icon = stage.icon

          return (
            <div key={stage.key} className="flex items-center justify-between gap-3 p-2 rounded bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={16} className="text-accent flex-shrink-0" aria-hidden="true" />
                <span className="text-xs text-foreground">{stage.label}</span>
              </div>
              <StatusBadge
                status={badgeStatus}
                label={stageStatus.charAt(0).toUpperCase() + stageStatus.slice(1)}
                className="text-xs"
              />
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-xs text-muted-foreground text-center py-2 border-t border-border/50">
        All systems operational
      </div>
    </div>
  )
}
