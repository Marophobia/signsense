'use client'

import { type FC, useEffect, useRef } from 'react'
import { type TranscriptEntry } from '@/hooks/use-sign-sense'
import { MessageCircle, Trash2 } from 'lucide-react'

interface TranscriptPanelProps {
  transcriptHistory: TranscriptEntry[]
  onClear: () => void
  className?: string
}

export const TranscriptPanel: FC<TranscriptPanelProps> = ({ transcriptHistory, onClear, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcriptHistory])

  return (
    <div className={`flex flex-col h-full rounded-lg border border-border bg-card/40 backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle size={18} className="text-accent flex-shrink-0" aria-hidden="true" />
          <h3 className="font-syne font-semibold text-sm truncate">Live Transcript</h3>
        </div>
        <button
          onClick={onClear}
          disabled={transcriptHistory.length === 0}
          className="touch-target p-2 rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Clear transcript"
          title="Clear transcript"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Transcript Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        role="log"
        aria-label="Transcript messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {transcriptHistory.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No transcript yet...</p>
        ) : (
          transcriptHistory.map((entry) => (
            <div
              key={entry.id}
              className="animate-sentence-slide-up"
              role="article"
              aria-label={`Message: ${entry.text}`}
            >
              <p
                className={`text-sm leading-relaxed ${
                  entry.isPartial ? 'text-muted-foreground italic' : 'text-foreground'
                }`}
              >
                {entry.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer with message count */}
      <div className="px-4 py-2 border-t border-border/50 text-xs text-muted-foreground text-center">
        {transcriptHistory.length} message{transcriptHistory.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
