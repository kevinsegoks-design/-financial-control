'use client'

import { useState } from 'react'
import type { CreditCard, CardStatement, Installment } from '@/types/database'
import { analyzeCard, computeHealthScore, getMonthlyCommitment } from '@/lib/financeAnalysis'
import { fmtUSDCompact, fmtUSD } from '@/lib/format'

interface Props {
  cards: CreditCard[]
  statements: CardStatement[]
  installments: Installment[]
}

const fmtDate = (d: Date) => d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })

const REC_META = {
  excellent: { emoji: '✅', color: '#30D158', label: 'Excelente para comprar' },
  good:      { emoji: '👍', color: '#FFD60A', label: 'Buen momento' },
  caution:   { emoji: '⚠️', color: '#FF9F0A', label: 'Precaución' },
  avoid:     { emoji: '🚫', color: '#FF453A', label: 'Evitar compras corrientes' },
}

function healthLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'Excelente', color: '#30D158' }
  if (score >= 60) return { text: 'Buena', color: '#FFD60A' }
  if (score >= 40) return { text: 'Regular', color: '#FF9F0A' }
  return { text: 'En riesgo', color: '#FF453A' }
}

function utilizationColor(pct: number): string {
  if (pct < 30) return '#30D158'
  if (pct < 70) return '#FF9F0A'
  return '#FF453A'
}

function getProjection(installments: Installment[], statements: CardStatement[]) {
  return [0, 1, 2].map(offset => {
    const d = new Date()
    d.setMonth(d.getMonth() + offset)
    const label = d.toLocaleDateString('es-EC', { month: 'short', year: '2-digit' })
    const diferidos = installments
      .filter(i => i.status === 'active' && i.remaining_installments > offset)
      .reduce((s, i) => s + i.monthly_amount, 0)
    const corriente = offset === 0
      ? statements.filter(s => s.status !== 'paid').reduce((s, st) => s + st.closing_balance, 0)
      : 0
    return { label, diferidos, corriente, total: diferidos + corriente }
  })
}

export default function SmartAdvisor({ cards, statements, installments }: Props) {
  const [open, setOpen] = useState(false)

  if (cards.length === 0) return null

  const timings = cards.map(c => analyzeCard(c, statements.find(s => s.card_id === c.id), installments))
  const score = computeHealthScore(timings, statements)
  const { diferidos, corriente, total } = getMonthlyCommitment(statements, installments)
  const health = healthLabel(score)

  const sorted = [...timings].sort((a, b) => b.daysUntilCut - a.daysUntilCut)
  const best = sorted[0]
  const toAvoid = timings.filter(t => t.recommendation === 'avoid' || t.recommendation === 'caution')
  const projection = getProjection(installments, statements)
  const maxProjection = Math.max(...projection.map(p => p.total), 1)

  return (
    <div className="glass" style={{ overflow: 'hidden', borderColor: 'rgba(157,123,255,0.15)' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Guía Financiera</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Health badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: health.color,
              boxShadow: `0 0 6px ${health.color}`,
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: health.color }}>{score}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{health.text}</span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Health bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }}>
        <div style={{
          height: '100%', width: `${score}%`, borderRadius: 2,
          background: `linear-gradient(90deg, ${health.color}88, ${health.color})`,
          transition: 'width 1s ease',
        }} />
      </div>

      {/* Expandable content */}
      {open && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Best card */}
          <div>
            <p className="label-xs" style={{ marginBottom: 8 }}>Mejor tarjeta para comprar hoy</p>
            <div style={{
              background: `${REC_META[best.recommendation].color}10`,
              border: `1px solid ${REC_META[best.recommendation].color}25`,
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{REC_META[best.recommendation].emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: REC_META[best.recommendation].color }}>
                  {REC_META[best.recommendation].label}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                {best.card.nickname ?? best.card.bank?.name ?? 'Tarjeta'}
                {best.card.last_four ? ` ••${best.card.last_four}` : ''}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Corte en <strong style={{ color: 'var(--text-primary)' }}>{best.daysUntilCut} días</strong> ({fmtDate(best.nextCutDate)})
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Pagas el <strong style={{ color: 'var(--text-primary)' }}>{fmtDate(best.nextPaymentDate)}</strong>
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Si compras hoy tienes <strong style={{ color: REC_META[best.recommendation].color }}>{best.graceIfBuyToday} días</strong> sin intereses
              </p>
            </div>
          </div>

          {/* Cards to avoid */}
          {toAvoid.length > 0 && (
            <div>
              <p className="label-xs" style={{ marginBottom: 8 }}>Evitar compras corrientes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {toAvoid.map(t => (
                  <div key={t.card.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>
                        {t.card.nickname ?? t.card.bank?.name}
                        {t.card.last_four ? ` ••${t.card.last_four}` : ''}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Corte en {t.daysUntilCut} días — {t.recommendation === 'avoid' ? 'diferir o usar otra tarjeta' : 'mejor diferir si es compra grande'}
                      </p>
                    </div>
                    <span style={{ fontSize: 18 }}>{REC_META[t.recommendation].emoji}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly commitment */}
          {total > 0 && (
            <div>
              <p className="label-xs" style={{ marginBottom: 8 }}>Compromisos este mes</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {diferidos > 0 && (
                  <div style={{ flex: 1, background: 'rgba(157,123,255,0.08)', border: '1px solid rgba(157,123,255,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                    <p className="label-xs" style={{ marginBottom: 4 }}>Diferidos</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#9D7BFF' }}>{fmtUSDCompact(diferidos)}/mes</p>
                  </div>
                )}
                {corriente > 0 && (
                  <div style={{ flex: 1, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                    <p className="label-xs" style={{ marginBottom: 4 }}>Corriente pendiente</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#FF9F0A' }}>{fmtUSDCompact(corriente)}</p>
                  </div>
                )}
              </div>
              {diferidos > 0 && corriente > 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center' }}>
                  Total comprometido este mes: <strong style={{ color: 'var(--text-primary)' }}>{fmtUSDCompact(total)}</strong>
                </p>
              )}
            </div>
          )}

          {/* Utilization per card */}
          <div>
            <p className="label-xs" style={{ marginBottom: 8 }}>Utilización por tarjeta</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cards.map(card => {
                const stmt = statements.find(s => s.card_id === card.id)
                const used = (stmt && stmt.status !== 'paid') ? stmt.closing_balance : 0
                const pct = card.credit_limit > 0 ? Math.round((used / card.credit_limit) * 100) : 0
                const color = utilizationColor(pct)
                const dot = pct < 30 ? '🟢' : pct < 70 ? '🟡' : '🔴'
                return (
                  <div key={card.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {dot} {card.nickname ?? card.bank?.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease', boxShadow: `0 0 6px ${color}60` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtUSD(used)} usado</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>límite {fmtUSDCompact(card.credit_limit)}</span>
                    </div>
                  </div>
                )
              })}
              {cards.length > 1 && (() => {
                const minCard = cards.reduce((best, c) => {
                  const s = statements.find(st => st.card_id === c.id)
                  const pct = c.credit_limit > 0 ? (s?.closing_balance ?? 0) / c.credit_limit : 1
                  const bestS = statements.find(st => st.card_id === best.id)
                  const bestPct = best.credit_limit > 0 ? (bestS?.closing_balance ?? 0) / best.credit_limit : 1
                  return pct < bestPct ? c : best
                })
                const minPct = Math.round(((statements.find(s => s.card_id === minCard.id)?.closing_balance ?? 0) / minCard.credit_limit) * 100)
                if (minPct < 30) {
                  return (
                    <p style={{ fontSize: 11, color: '#30D158', background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.12)', borderRadius: 8, padding: '7px 10px', marginTop: 2 }}>
                      💡 Usa <strong>{minCard.nickname ?? minCard.bank?.name}</strong> para nuevas compras — tiene más cupo disponible.
                    </p>
                  )
                }
                return null
              })()}
            </div>
          </div>

          {/* Minimum payment cost warning */}
          {statements.some(s => s.status !== 'paid' && s.minimum_payment && s.minimum_payment < s.closing_balance) && (
            <div>
              <p className="label-xs" style={{ marginBottom: 8 }}>Costo de pagar solo el mínimo</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {statements.filter(s => s.status !== 'paid' && s.minimum_payment && s.minimum_payment < s.closing_balance).map(s => {
                  const card = cards.find(c => c.id === s.card_id)
                  const rate = (card?.interest_rate ?? 17) / 100 / 12
                  const remaining = s.closing_balance - (s.minimum_payment ?? 0)
                  const interestCost = remaining * rate
                  return (
                    <div key={s.id} style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)', borderRadius: 10, padding: '9px 12px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
                        {card?.nickname ?? card?.bank?.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Si pagas solo el mínimo ({fmtUSD(s.minimum_payment ?? 0)}), deberás{' '}
                        <strong style={{ color: '#FF453A' }}>+{fmtUSD(interestCost)}</strong> extra el próximo mes (~17% anual).
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3-month projection */}
          {projection.some(p => p.total > 0) && (
            <div>
              <p className="label-xs" style={{ marginBottom: 8 }}>Proyección 3 meses</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {projection.map((p, i) => (
                  <div key={i} style={{ flex: 1, background: i === 0 ? 'rgba(157,123,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(157,123,255,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: i === 0 ? '#9D7BFF' : 'var(--text-muted)', marginBottom: 6, fontWeight: i === 0 ? 700 : 400 }}>{p.label}</p>
                    {/* Stacked mini-bar */}
                    <div style={{ height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse', marginBottom: 6 }}>
                      {p.diferidos > 0 && (
                        <div style={{ width: '100%', height: `${(p.diferidos / maxProjection) * 100}%`, background: '#9D7BFF', transition: 'height 0.8s ease' }} />
                      )}
                      {p.corriente > 0 && (
                        <div style={{ width: '100%', height: `${(p.corriente / maxProjection) * 100}%`, background: '#FF9F0A', transition: 'height 0.8s ease' }} />
                      )}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>{fmtUSDCompact(p.total)}</p>
                    {p.diferidos > 0 && <p style={{ fontSize: 9, color: '#9D7BFF', marginTop: 2 }}>dif {fmtUSDCompact(p.diferidos)}</p>}
                    {p.corriente > 0 && <p style={{ fontSize: 9, color: '#FF9F0A' }}>cur {fmtUSDCompact(p.corriente)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ecuador-specific tips */}
          <div style={{
            background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.12)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#30D158', marginBottom: 6, letterSpacing: '0.05em' }}>
              CONSEJOS PARA ECUADOR
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                📅 <strong>Compra corriente</strong> justo después del corte — obtienes el máximo plazo sin interés (~45 días).
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                📦 <strong>Diferidos</strong>: si el comercio ofrece 0% de interés, siempre es mejor que corriente para compras grandes.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                ⚡ <strong>Paga el saldo completo</strong> antes del vencimiento — el interés en Ecuador es ~17% anual, el mínimo solo aumenta la deuda.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
