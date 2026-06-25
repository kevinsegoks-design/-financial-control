'use client'

import HeroMetric from '@/components/personal/HeroMetric'
import CreditCardCard from '@/components/personal/CreditCardCard'
import DueSemaphore from '@/components/personal/DueSemaphore'
import InstallmentsWidget from '@/components/personal/InstallmentsWidget'
import type { CreditCard, CardStatement, Installment, Obligation, ObligationPeriod, DueItem } from '@/types/database'

interface Props {
  cards: CreditCard[]
  statements: CardStatement[]
  installments: Installment[]
  obligations: Obligation[]
  periods: ObligationPeriod[]
  dueItems: DueItem[]
  stats: {
    totalLimit: number
    totalUsed: number
    totalAvailable: number
  }
}

const FLOAT_CLASSES = ['float-1', 'float-2', 'float-3', 'float-4', 'float-5']
const FADE_CLASSES  = ['fade-up', 'fade-up-d1', 'fade-up-d2', 'fade-up-d3', 'fade-up-d4']

export default function PersonalDashboard({ cards, statements, installments, dueItems, stats }: Props) {
  const overdue = dueItems.filter(i => {
    if (i.status === 'overdue') return true
    const d = Math.ceil((new Date(i.due_date).getTime() - Date.now()) / 86_400_000)
    return d < 0
  })

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero */}
      <HeroMetric
        totalAvailable={stats.totalAvailable}
        totalLimit={stats.totalLimit}
        totalUsed={stats.totalUsed}
      />

      {/* Overdue urgent alert */}
      {overdue.length > 0 && (
        <div className="fade-up-d1" style={{
          padding: '12px 16px',
          background: 'rgba(255,69,58,0.08)',
          border: '1px solid rgba(255,69,58,0.2)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FF453A' }}>
              {overdue.length} pago{overdue.length > 1 ? 's' : ''} vencido{overdue.length > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Revisa el semáforo abajo para resolver
            </p>
          </div>
        </div>
      )}

      {/* Tarjetas */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
            💳 Tarjetas ({cards.length})
          </h2>
          <a href="/personal/cards" style={{ fontSize: 11, color: '#9D7BFF', textDecoration: 'none' }}>
            Ver todas →
          </a>
        </div>
        {cards.length === 0 ? (
          <div className="glass" style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay tarjetas registradas</p>
            <a href="/personal/cards" style={{ fontSize: 13, color: '#9D7BFF', display: 'block', marginTop: 8 }}>
              + Agregar tarjeta
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cards.map((card, i) => {
              const statement = statements.find(s => s.card_id === card.id)
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

      {/* Semáforo vencimientos */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
            🚦 Vencimientos
          </h2>
          <a href="/personal/payments" style={{ fontSize: 11, color: '#9D7BFF', textDecoration: 'none' }}>
            Registrar pago →
          </a>
        </div>
        <DueSemaphore items={dueItems} />
      </section>

      {/* Diferidos */}
      {installments.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
              📦 Diferidos activos
            </h2>
          </div>
          <InstallmentsWidget installments={installments} />
        </section>
      )}
    </div>
  )
}
