'use client'

import { type FC } from 'react'
import { type GestureData } from '@/hooks/use-sign-sense'
import { Hand } from 'lucide-react'

interface GestureDisplayProps {
  gesture: GestureData | null
  className?: string
}

export const GestureDisplay: FC<GestureDisplayProps> = ({ gesture, className = '' }) => {
  if (!gesture) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 p-8 rounded-lg border border-dashed border-border ${className}`}
        role="status"
        aria-label="Waiting for gesture"
      >
        <Hand size={48} className="text-muted-foreground opacity-50" aria-hidden="true" />
        <p className="text-muted-foreground text-sm">Waiting for gesture...</p>
      </div>
    )
  }

  return (
    <div
      className={`gesture-card animate-gesture-reveal ${className}`}
      role="article"
      aria-label={`Gesture detected: ${gesture.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="gesture-highlight text-xl mb-2 truncate">{gesture.name}</h3>
          <p className="text-sm text-muted-foreground">
            Confidence: <span className="text-foreground">{(gesture.confidence * 100).toFixed(1)}%</span>
          </p>
        </div>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0">
          <Hand size={24} className="text-accent" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300"
          style={{ width: `${gesture.confidence * 100}%` }}
          role="progressbar"
          aria-valuenow={Math.round(gesture.confidence * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Confidence level"
        />
      </div>
    </div>
  )
}
