'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fmtUSD, fmtUSDCompact } from '@/lib/format'

interface Props {
  statements: any[]
  obligationPeriods: any[]
  recentPayments: any[]
  workspaceId: string
}

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: '2-digit' })

export default function PaymentsClient({ statements, obligationPeriods, recentPayments, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  const totalPaidThisMonth = recentPayments.reduce((s: number, p: any) => {
    const d = new Date(p.payment_date)
    const now = new Date()
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      return s + p.amount
    }
    return s
  }, 0)

  async function registerPayment(type: 'statement' | 'obligation', id: string, defaultAmount: number) {
    const amount = parseFloat(amounts[id] || String(defaultAmount))
    if (!amount || amount <= 0) return
    setLoading(id)

    const payload: any = {
      workspace_id: workspaceId,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'transferencia',
    }

    if (type === 'statement') {
      payload.card_statement_id = id
      const newBalance = Math.max(0, defaultAmount - amount)
      await supabase.from('personal_payments').insert(payload)
      await supabase.from('card_statements').update({
        closing_balance: newBalance,
        status: newBalance === 0 ? 'paid' : 'partial',
      }).eq('id', id)
    } else {
      payload.obligation_period_id = id
      const period = obligationPeriods.find((p: any) => p.id === id)
      await supabase.from('personal_payments').insert(payload)
      await supabase.from('obligation_periods').update({
        amount_paid: (period?.amount_paid ?? 0) + amount,
        status: amount >= (period?.amount_due ?? 0) - (period?.amount_paid ?? 0) ? 'paid' : 'partial',
      }).eq('id', id)
    }

    setLoading(null)
    router.refresh()
  }

  const pendingStatements = statements.filter((s: any) => s.status !== 'paid')
  const pendingPeriods = obligationPeriods.filter((p: any) => p.status !== 'paid' && p.status !== 'waived')
  const hasPending = pendingStatements.length > 0 || pendingPeriods.length > 0

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>

      {/* Header con total pagado este mes */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Pagos</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Registra y revisa tus pagos</p>
        </div>
        {totalPaidThisMonth > 0 && (
          <div style={{ textAlign: 'right', background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)', borderRadius: 10, padding: '8px 14px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pagado este mes</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#30D158' }}>{fmtUSDCompact(totalPaidThisMonth)}</p>
          </div>
        )}
      </div>

      {/* Tarjetas pendientes */}
      {pendingStatements.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
            TARJETAS PENDIENTES
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingStatements.map((st: any) => {
              const card = st.credit_card
              const accent = card?.accent_color ?? '#FFD60A'
              const remaining = st.closing_balance
              const minPay = st.minimum_payment
              const rate = (card?.interest_rate ?? 17) / 100 / 12
              const interestIfMin = minPay ? (remaining - minPay) * rate : null
              const daysLeft = Math.ceil((new Date(st.due_date + 'T12:00:00').getTime() - Date.now()) / 86_400_000)

              return (
                <div key={st.id} className="glass" style={{ padding: 16, borderColor: `${accent}30`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, ${accent}44)` }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700 }}>
                        {card?.nickname ?? card?.bank?.name}
                        {card?.last_four && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}> ••{card.last_four}</span>}
                      </p>
                      <p style={{ fontSize: 11, color: daysLeft < 0 ? '#FF453A' : daysLeft <= 3 ? '#FF9F0A' : 'var(--text-muted)', marginTop: 3 }}>
                        {daysLeft < 0 ? `Venció hace ${Math.abs(daysLeft)} días` : daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft} días · ${fmtDate(st.due_date)}`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: accent }}>{fmtUSD(remaining)}</p>
                      {minPay && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Mínimo: {fmtUSD(minPay)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Advertencia de interés */}
                  {interestIfMin && interestIfMin > 0.5 ? (
                    <div style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 8, padding: '7px 10px', marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: '#FF453A' }}>
                        ⚠️ Si pagas solo el mínimo, generarás <strong>{fmtUSD(interestIfMin)}</strong> en intereses el próximo mes ({card?.interest_rate ?? 17}% anual)
                      </p>
                    </div>
                  ) : remaining > 0 && (
                    <div style={{ background: 'rgba(255,159,10,0.07)', border: '1px solid rgba(255,159,10,0.2)', borderRadius: 8, padding: '7px 10px', marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: '#FF9F0A' }}>
                        💡 Si no pagas este mes generarás <strong>{fmtUSD(remaining * (card?.interest_rate ?? 17) / 100 / 12)}</strong> en intereses ({card?.interest_rate ?? 17}% anual)
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="input-glass"
                      type="number"
                      placeholder={fmtUSD(remaining).replace('$', '')}
                      value={amounts[st.id] ?? ''}
                      onChange={e => setAmounts(a => ({ ...a, [st.id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    {minPay && (
                      <button
                        onClick={() => setAmounts(a => ({ ...a, [st.id]: String(minPay) }))}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Solo mín
                      </button>
                    )}
                    <button
                      onClick={() => registerPayment('statement', st.id, remaining)}
                      disabled={loading === st.id}
                      style={{
                        background: `${accent}22`, border: `1px solid ${accent}55`,
                        color: accent, borderRadius: 8, padding: '9px 14px',
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
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
            OBLIGACIONES PENDIENTES
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingPeriods.map((p: any) => {
              const remaining = p.amount_due - p.amount_paid
              return (
                <div key={p.id} className="glass" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700 }}>{p.obligation?.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.obligation?.category} · {fmtDate(p.due_date)}
                      </p>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#30D158' }}>{fmtUSD(remaining)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input-glass"
                      type="number"
                      placeholder={fmtUSD(remaining).replace('$', '')}
                      value={amounts[p.id] ?? ''}
                      onChange={e => setAmounts(a => ({ ...a, [p.id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => registerPayment('obligation', p.id, remaining)}
                      disabled={loading === p.id}
                      style={{
                        background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.35)',
                        color: '#30D158', borderRadius: 8, padding: '9px 14px',
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

      {!hasPending && (
        <div className="glass" style={{ padding: 32, textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 28 }}>🎉</p>
          <p style={{ color: '#30D158', fontWeight: 700, marginTop: 8 }}>¡Todo al día!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>No hay pagos pendientes este período</p>
        </div>
      )}

      {/* Historial de pagos */}
      {recentPayments.length > 0 && (
        <section>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
            HISTORIAL DE PAGOS
          </p>
          <div className="glass" style={{ overflow: 'hidden' }}>
            {recentPayments.map((pay: any, i: number) => {
              const isCard = !!pay.card_statement_id
              const card = pay.card_statement?.credit_card
              const obl = pay.obligation_period?.obligation
              const name = isCard
                ? `${card?.nickname ?? card?.bank?.name ?? 'Tarjeta'}${card?.last_four ? ` ••${card.last_four}` : ''}`
                : (obl?.name ?? 'Obligación')
              const accent = isCard ? (card?.accent_color ?? '#FFD60A') : '#30D158'
              const period = pay.card_statement?.period

              return (
                <div key={pay.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i < recentPayments.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${accent}15`, border: `1px solid ${accent}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15,
                  }}>
                    {isCard ? '💳' : '📋'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {fmtDate(pay.payment_date)}{period ? ` · ${period}` : ''}
                      {!isCard && obl?.category ? ` · ${obl.category}` : ''}
                    </p>
                  </div>

                  {/* Amount */}
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#30D158', flexShrink: 0 }}>
                    {fmtUSD(pay.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {recentPayments.length === 0 && !hasPending && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin historial de pagos aún</p>
        </div>
      )}
    </div>
  )
}
