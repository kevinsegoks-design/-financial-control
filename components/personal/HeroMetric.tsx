'use client'

import CountUp from '@/components/ui/CountUp'

interface Props {
  totalAvailable: number
  totalLimit: number
  totalUsed: number
}

export default function HeroMetric({ totalAvailable, totalLimit, totalUsed }: Props) {
  const pctUsed = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0

  return (
    <div
      className="glass-strong fade-up"
      style={{
        padding: '28px 24px',
        textAlign: 'center',
        background: 'rgba(48,209,88,0.04)',
        borderColor: 'rgba(48,209,88,0.12)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle green radial glow behind */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(48,209,88,0.05) 0%, transparent 70%)',
      }} />

      <p className="label-xs" style={{ marginBottom: 8 }}>Cupo disponible total</p>
      <div className="breathe mono" style={{ fontSize: 42, fontWeight: 900, color: '#30D158', letterSpacing: '-0.02em', lineHeight: 1 }}>
        $<CountUp value={totalAvailable} decimals={0} />
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
        de <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          ${totalLimit.toLocaleString('es-MX')}
        </span> límite total
      </p>

      {/* Mini progress bar */}
      <div style={{ marginTop: 16, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pctUsed}%`,
          background: pctUsed > 75 ? '#FF453A' : pctUsed > 50 ? '#FF9F0A' : '#30D158',
          borderRadius: 2,
          transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
        {pctUsed}% utilizado
      </p>
    </div>
  )
}
