'use client'

import type { CreditCard, CardStatement } from '@/types/database'
import { fmtUSDCompact } from '@/lib/format'

interface Props {
  card: CreditCard
  statement?: CardStatement
  floatClass?: string
  fadeClass?: string
}

function Chip() {
  return (
    <div style={{
      width: 32, height: 24, borderRadius: 5, flexShrink: 0,
      background: 'linear-gradient(135deg, #b8922a, #f0d060 45%, #c8a030)',
      border: '1px solid rgba(255,255,255,0.15)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.35), 0 1px 4px rgba(0,0,0,0.5)',
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr',
      overflow: 'hidden',
    }}>
      {[...Array(9)].map((_, i) => (
        <div key={i} style={{
          borderRight: i % 3 !== 2 ? '1px solid rgba(0,0,0,0.18)' : undefined,
          borderBottom: i < 6 ? '1px solid rgba(0,0,0,0.18)' : undefined,
        }} />
      ))}
    </div>
  )
}

export default function CreditCardCard({ card, statement, floatClass = 'float-1', fadeClass = 'fade-up' }: Props) {
  const used = (statement && statement.status !== 'paid') ? statement.closing_balance : 0
  const available = card.credit_limit - used
  const pctFree = card.credit_limit > 0 ? Math.round((available / card.credit_limit) * 100) : 100
  const accent = card.accent_color ?? '#9D7BFF'

  const statusColor = (() => {
    if (!statement) return accent
    if (statement.status === 'overdue') return '#FF453A'
    if (statement.status === 'paid') return '#30D158'
    if (statement.status === 'partial') return '#FF9F0A'
    return '#FF9F0A'
  })()

  const daysUntilDue = statement
    ? Math.ceil((new Date(statement.due_date + 'T12:00:00').getTime() - Date.now()) / 86_400_000)
    : null

  const statusLabel = (() => {
    if (!statement) return null
    if (statement.status === 'paid') return { text: '✓ Pagado', color: '#30D158' }
    if (statement.status === 'overdue') return { text: `Venció hace ${Math.abs(daysUntilDue!)}d`, color: '#FF453A' }
    if (daysUntilDue === 0) return { text: 'Vence hoy', color: '#FF9F0A' }
    if (daysUntilDue !== null && daysUntilDue > 0) return { text: `Vence en ${daysUntilDue}d`, color: daysUntilDue <= 3 ? '#FF9F0A' : '#FFD60A' }
    return null
  })()

  return (
    <div
      className={`${fadeClass} ${floatClass}`}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        minHeight: 172,
        background: `linear-gradient(140deg, ${accent}40 0%, ${accent}12 55%, rgba(10,10,20,0.85) 100%)`,
        border: `1px solid ${accent}35`,
        boxShadow: `0 8px 32px ${accent}15, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 ${accent}25`,
      }}
    >
      {/* Shine line top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent 0%, ${accent}70 50%, transparent 100%)` }} />

      {/* Decorative orbs */}
      <div style={{ position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: -30, bottom: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accent}10 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ padding: '18px 20px 16px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>

        {/* Row 1: bank name + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent }}>
            {card.bank?.name ?? 'Banco'}
          </span>
          {statusLabel && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', borderRadius: 20,
              background: `${statusLabel.color}15`,
              border: `1px solid ${statusLabel.color}35`,
              fontSize: 10, fontWeight: 700, color: statusLabel.color,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusLabel.color, boxShadow: `0 0 4px ${statusLabel.color}` }} />
              {statusLabel.text}
            </div>
          )}
        </div>

        {/* Row 2: chip + card number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Chip />
          <p className="mono" style={{ fontSize: 14, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
            •••• •••• •••• {card.last_four ?? '----'}
          </p>
        </div>

        {/* Row 3: name + available + bar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
                {card.nickname ?? card.holder}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                Corte {card.cut_day} · Pago {card.payment_due_day}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
                Disponible
              </p>
              <p style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: '-0.01em' }}>
                {fmtUSDCompact(available)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pctFree}%`,
              background: pctFree < 20 ? '#FF453A' : pctFree < 40 ? `linear-gradient(90deg, #FF9F0A, ${accent})` : `linear-gradient(90deg, ${accent}88, ${accent})`,
              borderRadius: 2,
              boxShadow: `0 0 8px ${accent}70`,
              transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{pctFree}% libre</span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>límite {fmtUSDCompact(card.credit_limit)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
