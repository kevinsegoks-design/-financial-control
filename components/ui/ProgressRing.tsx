'use client'

import { useEffect, useRef } from 'react'

interface Props {
  percent: number     // 0–100
  size?: number
  stroke?: number
  color?: string
  label?: string
  sublabel?: string
}

export default function ProgressRing({
  percent,
  size = 96,
  stroke = 7,
  color = '#30D158',
  label,
  sublabel,
}: Props) {
  const circleRef = useRef<SVGCircleElement>(null)
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(percent, 100) / 100)

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    el.style.setProperty('--ring-full', String(circ))
    el.style.setProperty('--ring-offset', String(offset))
    el.classList.remove('ring-animate')
    void (el as unknown as HTMLElement).offsetWidth // reflow
    el.classList.add('ring-animate')
  }, [percent, circ, offset])

  const glowColor = color + 'bb'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        {/* Fill */}
        <circle
          ref={circleRef}
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})`, transition: 'none' }}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
      }}>
        {label && <span style={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1 }}>{label}</span>}
        {sublabel && <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{sublabel}</span>}
      </div>
    </div>
  )
}
