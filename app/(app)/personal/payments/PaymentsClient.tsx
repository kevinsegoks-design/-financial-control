'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  statements: any[]
  obligationPeriods: any[]
  recentPayments: any[]
  workspaceId: string
}

const fmtMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

export default function PaymentsClient({ statements, obligationPeriods, recentPayments, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  async function registerPayment(type: 'statement' | 'obligation', id: string, defaultAmount: number) {
    const amount = parseFloat(amounts[id] || String(defaultAmount))
    if (!amount) return
    setLoading(id)

    const payload: any = {
      workspace_id: workspaceId,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'transferencia',
    }

    if (type === 'statement') {
      payload.card_statement_id = id
      await supabase.from('personal_payments').insert(payload)
      // Update statement status
      await supabase.from('card_statements').update({
        status: amount >= defaultAmount ? 'paid' : 'partial',
      }).eq('id', id)
    } else {
      payload.obligation_period_id = id
      const period = obligationPeriods.find(p => p.id === id)
      await supabase.from('personal_payments').insert(payload)
      await supabase.from('obligation_periods').update({
        amount_paid: (period?.amount_paid ?? 0) + amount,
        status: amount >= (period?.amount_due ?? 0) - (period?.amount_paid ?? 0) ? 'paid' : 'partial',
      }).eq('id', id)
    }

    setLoading(null)
    router.refresh()
  }

  const pendingStatements = statements.filter(s => s.status !== 'paid')
  const pendingPeriods = obligationPeriods.filter(p => p.status !== 'paid' && p.status !== 'waived')

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Registrar Pagos</h1>

      {/* Tarjetas pendientes */}
      {pendingStatements.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>💳 Estados de cuenta</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingStatements.map(st => {
              const card = st.credit_card
              const accent = card?.accent_color ?? '#FFD60A'
              const remaining = st.closing_balance
              return (
                <div key={st.id} className="glass" style={{ padding: 14, borderColor: `${accent}22` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>
                        {card?.nickname ?? card?.bank?.name} ••{card?.last_four ?? '--'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Vence: {new Date(st.due_date).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: accent }}>{fmtMXN(remaining)}</p>
                      {st.minimum_payment && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Mín: {fmtMXN(st.minimum_payment)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input-glass"
                      type="number"
                      placeholder={`${remaining}`}
                      value={amounts[st.id] ?? ''}
                      onChange={e => setAmounts(a => ({ ...a, [st.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => registerPayment('statement', st.id, remaining)}
                      disabled={loading === st.id}
                      style={{
                        background: `${accent}22`, border: `1px solid ${accent}44`,
                        color: accent, borderRadius: 8, padding: '0 14px',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                        opacity: loading === st.id ? 0.5 : 1,
                      }}
                    >
                      {loading === st.id ? '...' : 'Pagar ✓'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Obligaciones pendientes */}
      {pendingPeriods.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>📋 Obligaciones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingPeriods.map(p => {
              const remaining = p.amount_due - p.amount_paid
              return (
                <div key={p.id} className="glass" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{p.obligation?.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.obligation?.category} · {new Date(p.due_date).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#30D158' }}>{fmtMXN(remaining)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input-glass"
                      type="number"
                      placeholder={`${remaining}`}
                      value={amounts[p.id] ?? ''}
                      onChange={e => setAmounts(a => ({ ...a, [p.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => registerPayment('obligation', p.id, remaining)}
                      disabled={loading === p.id}
                      style={{
                        background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)',
                        color: '#30D158', borderRadius: 8, padding: '0 14px',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                        opacity: loading === p.id ? 0.5 : 1,
                      }}
                    >
                      {loading === p.id ? '...' : 'Pagar ✓'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {pendingStatements.length === 0 && pendingPeriods.length === 0 && (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 28 }}>🎉</p>
          <p style={{ color: '#30D158', fontWeight: 700, marginTop: 8 }}>¡Todo al día!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>No hay pagos pendientes este período</p>
        </div>
      )}

      {/* Historial reciente */}
      {recentPayments.length > 0 && (
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>⏱ Pagos recientes</h2>
          <div className="glass" style={{ padding: '0 0', overflow: 'hidden' }}>
            {recentPayments.map((pay, i) => (
              <div key={pay.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px',
                borderBottom: i < recentPayments.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>
                    {pay.card_statement_id ? '💳 Tarjeta' : '📋 Obligación'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(pay.payment_date).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#30D158' }}>{fmtMXN(pay.amount)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
