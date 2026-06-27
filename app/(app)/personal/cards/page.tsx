import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CardsClient from './CardsClient'

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase.from('workspaces').select('id').eq('type', 'personal').single()
  if (!ws) redirect('/select')

  const period = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [cardsRes, banksRes, membersRes, statementsRes] = await Promise.all([
    supabase.from('credit_cards').select('*, bank:banks(*)').eq('workspace_id', ws.id).order('created_at'),
    supabase.from('banks').select('*').eq('workspace_id', ws.id),
    supabase.from('personal_members').select('*').eq('workspace_id', ws.id),
    supabase.from('card_statements').select('*').eq('workspace_id', ws.id).eq('period', period),
  ])

  return (
    <CardsClient
      cards={cardsRes.data ?? []}
      banks={banksRes.data ?? []}
      members={membersRes.data ?? []}
      statements={statementsRes.data ?? []}
      workspaceId={ws.id}
      currentPeriod={period}
    />
  )
}
