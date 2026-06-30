'use client'

import { useState } from 'react'
import HeroMetric from '@/components/personal/HeroMetric'
import CreditCardCard from '@/components/personal/CreditCardCard'
import PaymentAlerts from '@/components/personal/PaymentAlerts'
import InstallmentsWidget from '@/components/personal/InstallmentsWidget'
import SmartAdvisor from '@/components/personal/SmartAdvisor'
import type { CreditCard, CardStatement, Installment, Obligation, ObligationPeriod, DueItem, PersonalMember } from '@/types/database'

interface Props {
  cards: CreditCard[]
  statements: CardStatement[]
  installments: Installment[]
  obligations: Obligation[]
  periods: ObligationPeriod[]
  dueItems: DueItem[]
  members: PersonalMember[]
  stats: {
    totalLimit: number
    totalUsed: number
    totalAvailable: number
  }
}

const FLOAT_CLASSES = ['float-1', 'float-2', 'float-3', 'float-4', 'float-5']
const FADE_CLASSES  = ['fade-up', 'fade-up-d1', 'fade-up-d2', 'fade-up-d3', 'fade-up-d4']

export default function PersonalDashboard({ cards, statements, installments, obligations, periods, dueItems, members, stats }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // ── Filter by member ────────────────────────────────────────────
  const filteredCards = selectedMemberId
    ? cards.filter(c => c.personal_member_id === selectedMemberId)
    : cards

  const filteredStatements = statements.filter(s =>
    filteredCards.some(c => c.id === s.card_id)
  )

  const filteredInstallments = installments.filter(i =>
    filteredCards.some(c => c.id === i.card_id)
  )

  const filteredObligations = selectedMemberId
    ? obligations.filter(o => !o.personal_member_id || o.personal_member_id === selectedMemberId)
    : obligations

  const filteredPeriods = periods.filter(p =>
    filteredObligations.some(o => o.id === p.obligation_id)
  )

  // ── Recompute stats from filtered data ─────────────────────────
  const totalLimit = filteredCards.reduce((s, c) => s + c.credit_limit, 0)
  const totalUsed  = filteredStatements.filter(st => st.status !== 'paid').reduce((s, st) => s + st.closing_balance, 0)
  const totalAvailable = totalLimit - totalUsed

  // ── DueItems for filtered data ─────────────────────────────────
  const filteredDueItems: DueItem[] = [
    ...filteredStatements
      .filter(st => st.status !== 'paid')
      .map(st => {
        const card = filteredCards.find(c => c.id === st.card_id)
        return {
          id: st.id,
          type: 'card_statement' as const,
          name: `${card?.nickname ?? card?.bank?.name ?? 'Tarjeta'} ••${card?.last_four ?? '--'}`,
          amount: st.closing_balance,
          due_date: st.due_date,
          status: st.status,
          accent_color: card?.accent_color,
          card_last_four: card?.last_four ?? undefined,
          bank_name: card?.bank?.name ?? undefined,
        }
      }),
    ...filteredPeriods
      .filter(p => p.status !== 'paid' && p.status !== 'waived')
      .map(p => {
        const obl = filteredObligations.find(o => o.id === p.obligation_id)
        return {
          id: p.id,
          type: 'obligation_period' as const,
          name: obl?.name ?? 'Obligación',
          amount: p.amount_due - p.amount_paid,
          due_date: p.due_date,
          status: p.status,
        }
      }),
  ]

  const overdue = filteredDueItems.filter(i => {
    if (i.status === 'overdue') return true
    const d = Math.ceil((new Date(i.due_date).getTime() - Date.now()) / 86_400_000)
    return d < 0
  })

  const selectedMember = members.find(m => m.id === selectedMemberId)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Member switcher */}
      {members.length > 0 && (
        <div className="fade-up" style={{
          display: 'flex', gap: 8, padding: '4px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(prev => prev === m.id ? null : m.id)}
              style={{
                flex: 1, padding: '9px 8px', borderRadius: 10,
                border: selectedMemberId === m.id ? `1px solid ${m.color}55` : '1px solid transparent',
                background: selectedMemberId === m.id ? `${m.color}18` : 'transparent',
                color: selectedMemberId === m.id ? m.color : 'var(--text-muted)',
                fontSize: 13, fontWeight: selectedMemberId === m.id ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: selectedMemberId === m.id ? m.color : 'var(--text-muted)',
                flexShrink: 0, transition: 'background 0.15s ease',
              }} />
              {m.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedMemberId(null)}
            style={{
              flex: 1, padding: '9px 8px', borderRadius: 10,
              border: selectedMemberId === null ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
              background: selectedMemberId === null ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: selectedMemberId === null ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: selectedMemberId === null ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            Todos
          </button>
        </div>
      )}

      {/* Hero */}
      <HeroMetric
        totalAvailable={totalAvailable}
        totalLimit={totalLimit}
        totalUsed={totalUsed}
        memberName={selectedMember?.name ?? null}
        memberColor={selectedMember?.color ?? null}
      />

      {/* Smart advisor */}
      <SmartAdvisor cards={filteredCards} statements={filteredStatements} installments={filteredInstallments} />

      {/* Tarjetas */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
            💳 Tarjetas ({filteredCards.length})
          </h2>
          <a href="/personal/cards" style={{ fontSize: 11, color: '#9D7BFF', textDecoration: 'none' }}>
            Ver todas →
          </a>
        </div>
        {filteredCards.length === 0 ? (
          <div className="glass" style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {selectedMemberId ? `${selectedMember?.name} no tiene tarjetas asignadas` : 'No hay tarjetas registradas'}
            </p>
            <a href="/personal/cards" style={{ fontSize: 13, color: '#9D7BFF', display: 'block', marginTop: 8 }}>
              + Agregar tarjeta
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredCards.map((card, i) => {
              const statement = filteredStatements.find(s => s.card_id === card.id)
              return (
                <CreditCardCard
                  key={card.id}
                  card={card}
                  statement={statement}
                  floatClass={FLOAT_CLASSES[i % FLOAT_CLASSES.length]}
                  fadeClass={FADE_CLASSES[i % FADE_CLASSES.length]}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Payment alerts */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
            🚦 Pagos
          </h2>
        </div>
        <PaymentAlerts items={filteredDueItems} />
      </section>

      {/* Diferidos */}
      {filteredInstallments.length > 0 && (
        <section>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
              📦 Diferidos activos
            </h2>
          </div>
          <InstallmentsWidget installments={filteredInstallments} cards={filteredCards} />
        </section>
      )}
    </div>
  )
}
