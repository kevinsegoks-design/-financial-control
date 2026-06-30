import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CardsClient from './CardsClient'
import type { Bank, PersonalMember } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase.from('workspaces').select('id').eq('type', 'personal').single()
  if (!ws) redirect('/select')

  const period = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [cardsRes, banksRes, membersRes, statementsRes, installmentsRes, paymentsRes] = await Promise.all([
    supabase.from('credit_cards').select('*, bank:banks(*)').eq('workspace_id', ws.id).order('created_at'),
    supabase.from('banks').select('id,name').eq('workspace_id', ws.id),
    supabase.from('personal_members').select('id,name').eq('workspace_id', ws.id),
    supabase.from('card_statements').select('*').eq('workspace_id', ws.id).eq('period', period),
    supabase.from('installments').select('*').eq('workspace_id', ws.id).eq('status', 'active').order('created_at'),
    supabase.from('personal_payments').select('*').eq('workspace_id', ws.id).not('card_statement_id', 'is', null).order('payment_date', { ascending: false }),
  ])

  return (
    <CardsClient
      cards={cardsRes.data ?? []}
      banks={(banksRes.data ?? []) as Bank[]}
      members={(membersRes.data ?? []) as PersonalMember[]}
      statements={statementsRes.data ?? []}
      installments={installmentsRes.data ?? []}
      payments={paymentsRes.data ?? []}
      workspaceId={ws.id}
      currentPeriod={period}
    />
  )
}
