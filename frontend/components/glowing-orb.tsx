'use client'

interface GlowingOrbProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'cyan'
}

const sizeStyles = {
  sm: 'w-48 h-48',
  md: 'w-80 h-80',
  lg: 'w-[500px] h-[500px]',
}

export function GlowingOrb({ className = '', size = 'md', color = 'blue' }: GlowingOrbProps) {
  const colorStyles =
    color === 'blue'
      ? 'from-primary/20 via-primary/5 to-transparent'
      : 'from-accent/15 via-accent/5 to-transparent'

  return (
    <div
      className={`rounded-full bg-gradient-radial ${colorStyles} blur-3xl animate-glow-pulse pointer-events-none ${sizeStyles[size]} ${className}`}
      aria-hidden="true"
    />
  )
}
