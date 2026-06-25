'use client'

import ProgressRing from '@/components/ui/ProgressRing'
import CountUp from '@/components/ui/CountUp'
import type { CreditCard, CardStatement } from '@/types/database'

interface Props {
  card: CreditCard
  statement?: CardStatement
  floatClass?: string
  fadeClass?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

export default function CreditCardCard({ card, statement, floatClass = 'float-1', fadeClass = 'fade-up' }: Props) {
  const used = statement?.closing_balance ?? 0
  const available = card.credit_limit - used
  const pctFree = card.credit_limit > 0 ? Math.round((available / card.credit_limit) * 100) : 100
  const accent = card.accent_color ?? '#FFD60A'

  const statusColor = (() => {
    if (!statement) return 'var(--text-muted)'
    if (statement.status === 'overdue') return '#FF453A'
    if (statement.status === 'paid') return '#30D158'
    if (statement.status === 'partial') return '#FF9F0A'
    return '#FF9F0A'
  })()

  const daysUntilDue = statement
    ? Math.ceil((new Date(statement.due_date).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div
      className={`glass glass-hover ${floatClass} ${fadeClass}`}
      style={{
        padding: '20px',
        borderColor: `${accent}22`,
        boxShadow: `0 4px 24px ${accent}0d`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent top strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, borderRadius: '16px 16px 0 0', opacity: 0.7 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {/* Left info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Bank + holder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: accent, background: `${accent}18`, padding: '2px 7px', borderRadius: 6,
            }}>
              {card.bank?.name ?? 'Banco'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{card.holder}</span>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, color: 'var(--text-primary)' }}>
            {card.nickname ?? `••••${card.last_four ?? '----'}`}
          </h3>

          {/* Available */}
          <div style={{ marginTop: 10 }}>
            <p className="label-xs" style={{ marginBottom: 3 }}>Disponible</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1 }}>
              <CountUp value={available} decimals={0} prefix="$" />
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              de <CountUp value={card.credit_limit} decimals={0} prefix="$" /> límite
            </p>
          </div>

          {/* Statement due */}
          {statement && (
            <div style={{ marginTop: 12 }}>
              <p className="label-xs" style={{ marginBottom: 2 }}>Saldo corte</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: statusColor }}>
                {fmt(statement.closing_balance)}
              </p>
              {daysUntilDue !== null && (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {daysUntilDue < 0
                    ? `Venció hace ${Math.abs(daysUntilDue)}d`
                    : daysUntilDue === 0
                    ? 'Vence hoy'
                    : `Vence en ${daysUntilDue}d`
                  }
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Progress ring */}
        <ProgressRing
          percent={pctFree}
          size={90}
          stroke={7}
          color={accent}
          label={`${pctFree}%`}
          sublabel="libre"
        />
      </div>

      {/* Status badge */}
      {statement && statement.status !== 'paid' && (
        <div style={{
          marginTop: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px',
          background: `${statusColor}12`,
          borderRadius: 8,
          border: `1px solid ${statusColor}22`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="sem-dot" style={{ '--sem-color': statusColor, '--sem-glow': `${statusColor}44` } as React.CSSProperties} />
            <span style={{ fontSize: 12, color: statusColor }}>
              {statement.status === 'overdue' ? 'Vencido' : statement.status === 'partial' ? 'Pago parcial' : 'Pendiente'}
            </span>
          </div>
          {statement.minimum_payment && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Mín: {fmt(statement.minimum_payment)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
