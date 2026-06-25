'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export default function CountUp({ value, duration = 1200, decimals = 0, prefix = '', suffix = '', className }: Props) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = startRef.current
    const diff = value - start
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(start + diff * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
      else startRef.current = value
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const formatted = display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return <span className={className}>{prefix}{formatted}{suffix}</span>
}
