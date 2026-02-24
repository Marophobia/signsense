'use client'

import { type FC } from 'react'

interface SignSenseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  animated?: boolean
}

const sizeMap = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
}

export const SignSenseLogo: FC<SignSenseLogoProps> = ({ size = 'md', className = '', animated = false }) => {
  const dimension = sizeMap[size]

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SignSense AI Logo"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b7bf6" />
          <stop offset="100%" stopColor="#56a0ff" />
        </linearGradient>
        <linearGradient id="logoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b7bf6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#56a0ff" stopOpacity="0.1" />
        </linearGradient>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Outer glow ring */}
      <circle cx="32" cy="32" r="30" fill="url(#logoGlow)" opacity="0.5" />
      {/* Main circle */}
      <circle cx="32" cy="32" r="26" stroke="url(#logoGradient)" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Inner circle */}
      <circle cx="32" cy="32" r="18" stroke="url(#logoGradient)" strokeWidth="1" fill="none" opacity="0.3" />
      {/* Hand symbol - stylized open palm */}
      <g filter="url(#softGlow)">
        {/* Palm */}
        <path
          d="M28 38V28a2 2 0 014 0v-4a2 2 0 014 0v2a2 2 0 014 0v6l-2 8h-10l-2-6z"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {animated && (
            <animate
              attributeName="stroke-opacity"
              values="0.8;1;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </path>
        {/* Index finger */}
        <line x1="30" y1="28" x2="30" y2="22" stroke="url(#logoGradient)" strokeWidth="1.8" strokeLinecap="round">
          {animated && (
            <animate attributeName="y2" values="22;20;22" dur="3s" repeatCount="indefinite" />
          )}
        </line>
        {/* Middle finger */}
        <line x1="34" y1="24" x2="34" y2="18" stroke="url(#logoGradient)" strokeWidth="1.8" strokeLinecap="round">
          {animated && (
            <animate attributeName="y2" values="18;16;18" dur="2.5s" repeatCount="indefinite" />
          )}
        </line>
        {/* Ring finger */}
        <line x1="38" y1="26" x2="38" y2="21" stroke="url(#logoGradient)" strokeWidth="1.8" strokeLinecap="round">
          {animated && (
            <animate attributeName="y2" values="21;19;21" dur="2.8s" repeatCount="indefinite" />
          )}
        </line>
      </g>
      {/* Pulse dots */}
      <circle cx="20" cy="26" r="1.5" fill="#3b7bf6" opacity="0.6">
        {animated && (
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx="44" cy="26" r="1.5" fill="#56a0ff" opacity="0.4">
        {animated && (
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.3s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx="32" cy="48" r="1.5" fill="#3b7bf6" opacity="0.5">
        {animated && (
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.8s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  )
}
