'use client'

import type { Installment, CreditCard } from '@/types/database'
import CountUp from '@/components/ui/CountUp'

interface Props {
  installments: Installment[]
  cards?: CreditCard[]
}

export default function InstallmentsWidget({ installments, cards = [] }: Props) {
  const active = installments.filter(i => i.status === 'active')
  const totalBalance = active.reduce((s, i) => s + i.remaining_balance, 0)
  const totalMonthly = active.reduce((s, i) => s + i.monthly_amount, 0)

  if (active.length === 0) {
    return (
      <div className="glass" style={{ padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin diferidos activos</p>
      </div>
    )
  }

  return (
    <div className="glass" style={{ padding: '16px' }}>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <p className="label-xs" style={{ marginBottom: 3 }}>Saldo total</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#FF9F0A' }}>
            $<CountUp value={totalBalance} decimals={0} />
          </p>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <p className="label-xs" style={{ marginBottom: 3 }}>Mensual</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#9D7BFF' }}>
            $<CountUp value={totalMonthly} decimals={0} />
          </p>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <p className="label-xs" style={{ marginBottom: 3 }}>Activos</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{active.length}</p>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {active.slice(0, 4).map(inst => {
          const card = cards.find(c => c.id === inst.card_id)
          const pct = Math.round((inst.remaining_installments / inst.total_installments) * 100)
          return (
            <div key={inst.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{inst.description}</p>
                  {card && (
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      {card.nickname ?? card.bank?.name ?? 'Tarjeta'}
                      {card.last_four && <span style={{ color: card.accent_color ?? '#9D7BFF' }}> ••{card.last_four}</span>}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#9D7BFF' }}>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(inst.monthly_amount)}/mes</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#9D7BFF', borderRadius: 2, transition: 'width 1s ease' }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {inst.remaining_installments}/{inst.total_installments} pendientes
                </span>
              </div>
            </div>
          )
        })}
        {active.length > 4 && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
            +{active.length - 4} más
          </p>
        )}
      </div>
    </div>
  )
}
