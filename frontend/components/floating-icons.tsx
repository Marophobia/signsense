'use client'

import { useEffect, useState } from 'react'
import { Hand, Brain, MessageSquare, Zap, Eye, Cpu } from 'lucide-react'

const icons = [
  { Icon: Hand, x: 8, y: 15, delay: 0 },
  { Icon: Brain, x: 85, y: 20, delay: 0.5 },
  { Icon: MessageSquare, x: 12, y: 75, delay: 1 },
  { Icon: Zap, x: 90, y: 70, delay: 1.5 },
  { Icon: Eye, x: 5, y: 45, delay: 0.8 },
  { Icon: Cpu, x: 92, y: 45, delay: 1.2 },
]

export function FloatingIcons() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {icons.map(({ Icon, x, y, delay }, idx) => (
        <div
          key={idx}
          className="absolute animate-float opacity-0"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            animationDelay: `${delay}s`,
            animationFillMode: 'forwards',
            animation: `float 6s ease-in-out ${delay}s infinite, badge-fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`,
          }}
        >
          <div className="p-3 rounded-xl glass border border-primary/10">
            <Icon size={20} className="text-primary/40" />
          </div>
        </div>
      ))}
    </div>
  )
}
