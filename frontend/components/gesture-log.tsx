'use client'

import { type FC, useMemo } from 'react'
import { type GestureData } from '@/hooks/use-sign-sense'
import { BarChart3, TrendingUp } from 'lucide-react'

interface GestureLogProps {
  gestures: GestureData[]
  className?: string
}

export const GestureLog: FC<GestureLogProps> = ({ gestures, className = '' }) => {
  const gestureStats = useMemo(() => {
    if (gestures.length === 0) return { total: 0, unique: 0, topGesture: null }

    const grouped = gestures.reduce(
      (acc, gesture) => {
        if (!acc[gesture.name]) {
          acc[gesture.name] = { count: 0, avgConfidence: 0, total: 0 }
        }
        acc[gesture.name].count += 1
        acc[gesture.name].total += gesture.confidence
        return acc
      },
      {} as Record<string, { count: number; avgConfidence: number; total: number }>
    )

    for (const key in grouped) {
      grouped[key].avgConfidence = grouped[key].total / grouped[key].count
    }

    const sorted = Object.entries(grouped).sort(([, a], [, b]) => b.count - a.count)

    return {
      total: gestures.length,
      unique: sorted.length,
      topGesture: sorted[0]
        ? { name: sorted[0][0], count: sorted[0][1].count, avgConfidence: sorted[0][1].avgConfidence }
        : null,
    }
  }, [gestures])

  return (
    <div className={`glass p-4 rounded-lg ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-accent flex-shrink-0" aria-hidden="true" />
        <h3 className="font-syne font-semibold text-sm">Gesture Statistics</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 rounded bg-muted/20">
          <span className="text-xs text-muted-foreground">Total Gestures</span>
          <span className="font-syne font-semibold text-base text-accent">{gestureStats.total}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-muted/20">
          <span className="text-xs text-muted-foreground">Unique Gestures</span>
          <span className="font-syne font-semibold text-base text-accent">{gestureStats.unique}</span>
        </div>

        {gestureStats.topGesture && (
          <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-xs text-muted-foreground truncate">Top Gesture</span>
            </div>
            <div className="flex flex-col items-end min-w-0">
              <span className="font-syne font-semibold text-xs text-primary truncate">
                {gestureStats.topGesture.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {gestureStats.topGesture.count}x ({(gestureStats.topGesture.avgConfidence * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
