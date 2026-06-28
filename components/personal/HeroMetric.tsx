'use client'

import CountUp from '@/components/ui/CountUp'

interface Props {
  totalAvailable: number
  totalLimit: number
  totalUsed: number
  memberName?: string | null
  memberColor?: string | null
}

export default function HeroMetric({ totalAvailable, totalLimit, totalUsed, memberName, memberColor }: Props) {
  const pctUsed = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0
  const pctFree = 100 - pctUsed
  const barColor = pctFree < 20 ? '#FF453A' : pctFree < 40 ? '#FF9F0A' : '#30D158'

  return (
    <div
      className="glass-strong fade-up"
      style={{
        padding: '28px 24px 24px',
        textAlign: 'center',
        background: 'rgba(48,209,88,0.03)',
        borderColor: 'rgba(48,209,88,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 70% at 50% 80%, rgba(48,209,88,0.07) 0%, transparent 70%)',
      }} />

      {/* Decorative ring */}
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%',
        border: '1px solid rgba(48,209,88,0.06)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%',
        border: '1px solid rgba(48,209,88,0.04)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Label */}
        <p className="label-xs" style={{ marginBottom: 10 }}>
          {memberName
            ? <span>Cupo de <span style={{ color: memberColor ?? '#30D158', fontWeight: 700 }}>{memberName}</span></span>
            : 'Cupo disponible total'}
        </p>

        {/* Big number with gradient */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 4 }}>
          {/* Blur glow behind number */}
          <div style={{
            position: 'absolute', inset: '-10px -20px',
            background: 'radial-gradient(ellipse, rgba(48,209,88,0.18) 0%, transparent 70%)',
            filter: 'blur(12px)', pointerEvents: 'none',
          }} />
          <p className="mono" style={{
            fontSize: 56, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #30D158 0%, #7FE89A 50%, #30D158 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            position: 'relative',
          }}>
            $<CountUp value={totalAvailable} decimals={0} />
          </p>
        </div>

        {/* Sub-label */}
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
          <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            ${totalUsed.toLocaleString('en-US')}
          </span>
          {' '}usado de{' '}
          <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            ${totalLimit.toLocaleString('en-US')}
          </span>{' '}límite
        </p>

        {/* Bar */}
        <div style={{ marginTop: 18, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pctFree}%`,
            background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
            borderRadius: 3,
            boxShadow: `0 0 10px ${barColor}60`,
            transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: barColor, fontWeight: 600 }}>{pctFree}% libre</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pctUsed}% utilizado</span>
        </div>
      </div>
    </div>
  )
}
