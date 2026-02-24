'use client'

import { type FC } from 'react'
import { Play, Square, RotateCcw } from 'lucide-react'

interface SessionControlsProps {
  isActive: boolean
  isLoading: boolean
  onStart: () => void
  onStop: () => void
  onClear: () => void
  className?: string
}

export const SessionControls: FC<SessionControlsProps> = ({
  isActive,
  isLoading,
  onStart,
  onStop,
  onClear,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Primary Control */}
      <button
        onClick={isActive ? onStop : onStart}
        disabled={isLoading}
        className={`touch-target w-full py-3 px-4 rounded-lg font-syne font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          isActive
            ? 'bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/50 disabled:opacity-50'
            : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 disabled:opacity-50'
        }`}
        aria-label={isActive ? 'Stop session' : 'Start session'}
        title={isActive ? 'Stop session' : 'Start session'}
      >
        {isLoading ? (
          <>
            <span className="animate-spin inline-block">◐</span>
            <span>{isActive ? 'Stopping...' : 'Starting...'}</span>
          </>
        ) : isActive ? (
          <>
            <Square size={18} aria-hidden="true" />
            <span>Stop Session</span>
          </>
        ) : (
          <>
            <Play size={18} aria-hidden="true" />
            <span>Start Session</span>
          </>
        )}
      </button>

      {/* Secondary Actions */}
      <button
        onClick={onClear}
        disabled={isLoading || isActive}
        className="touch-target w-full py-2.5 px-4 rounded-lg font-syne font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-muted/20 hover:bg-muted/40 text-foreground border border-border disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Clear transcript"
        title="Clear transcript"
      >
        <RotateCcw size={16} aria-hidden="true" />
        <span>Clear</span>
      </button>

      {/* Info Text */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        {isActive ? 'Session active • Real-time capture enabled' : 'Ready to start • Camera access required'}
      </p>
    </div>
  )
}
