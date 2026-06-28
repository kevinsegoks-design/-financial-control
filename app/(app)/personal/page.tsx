import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PersonalDashboard from './PersonalDashboard'
import type { CreditCard, CardStatement, Installment, Obligation, ObligationPeriod, DueItem, PersonalMember } from '@/types/database'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function PersonalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener workspace personal
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('type', 'personal')
    .single()

  if (!ws) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Configurando tu workspace...</p>
      </div>
    )
  }

  const period = currentPeriod()

  // Cargar datos en paralelo
  const [cardsRes, statementsRes, installmentsRes, obligationsRes, periodsRes, membersRes] = await Promise.all([
    supabase
      .from('credit_cards')
      .select('*, bank:banks(*)')
      .eq('workspace_id', ws.id)
      .eq('status', 'active'),
    supabase
      .from('card_statements')
      .select('*')
      .eq('workspace_id', ws.id)
      .eq('period', period),
    supabase
      .from('installments')
      .select('*, credit_card:credit_cards(nickname,last_four,accent_color)')
      .eq('workspace_id', ws.id)
      .eq('status', 'active'),
    supabase
      .from('obligations')
      .select('*, personal_member:personal_members(name,color)')
      .eq('workspace_id', ws.id)
      .eq('status', 'active'),
    supabase
      .from('obligation_periods')
      .select('*')
      .eq('workspace_id', ws.id)
      .eq('period', period),
    supabase
      .from('personal_members')
      .select('*')
      .eq('workspace_id', ws.id)
      .order('name'),
  ])

  const cards = (cardsRes.data ?? []) as CreditCard[]
  const statements = (statementsRes.data ?? []) as CardStatement[]
  const installments = (installmentsRes.data ?? []) as Installment[]
  const obligations = (obligationsRes.data ?? []) as Obligation[]
  const periods = (periodsRes.data ?? []) as ObligationPeriod[]
  const members = (membersRes.data ?? []) as PersonalMember[]

  // Estadísticas
  const totalLimit = cards.reduce((s, c) => s + c.credit_limit, 0)
  const totalUsed = statements.reduce((s, st) => s + st.closing_balance, 0)
  const totalAvailable = totalLimit - totalUsed

  // Due items para semáforo
  const dueItems: DueItem[] = [
    ...statements
      .filter(st => st.status !== 'paid')
      .map(st => {
        const card = cards.find(c => c.id === st.card_id)
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
    ...periods
      .filter(p => p.status !== 'paid' && p.status !== 'waived')
      .map(p => {
        const obl = obligations.find(o => o.id === p.obligation_id)
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

  return (
    <PersonalDashboard
      cards={cards}
      statements={statements}
      installments={installments}
      obligations={obligations}
      periods={periods}
      dueItems={dueItems}
      members={members}
      stats={{ totalLimit, totalUsed, totalAvailable }}
    />
  )
}
