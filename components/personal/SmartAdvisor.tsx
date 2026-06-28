'use client'

import { useState } from 'react'
import type { CreditCard, CardStatement, Installment } from '@/types/database'
import { analyzeCard, computeHealthScore, getMonthlyCommitment } from '@/lib/financeAnalysis'
import { fmtUSDCompact } from '@/lib/format'

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
