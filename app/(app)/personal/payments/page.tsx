import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentsClient from './PaymentsClient'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase.from('workspaces').select('id').eq('type', 'personal').single()
  if (!ws) redirect('/select')

  const period = currentPeriod()

  const [statementsRes, periodsRes, paymentsRes] = await Promise.all([
    supabase.from('card_statements').select('*, credit_card:credit_cards(nickname,last_four,accent_color,bank:banks(name))').eq('workspace_id', ws.id).eq('period', period).neq('status', 'paid'),
    supabase.from('obligation_periods').select('*, obligation:obligations(name,category)').eq('workspace_id', ws.id).eq('period', period).neq('status', 'paid').neq('status', 'waived'),
    supabase.from('personal_payments').select('*').eq('workspace_id', ws.id).order('payment_date', { ascending: false }).limit(20),
  ])

  return (
    <PaymentsClient
      statements={statementsRes.data ?? []}
      obligationPeriods={periodsRes.data ?? []}
      recentPayments={paymentsRes.data ?? []}
      workspaceId={ws.id}
    />
  )
}
