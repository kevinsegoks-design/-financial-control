import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CardsClient from './CardsClient'

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase.from('workspaces').select('id').eq('type', 'personal').single()
  if (!ws) redirect('/select')

  const [cardsRes, banksRes, membersRes] = await Promise.all([
    supabase.from('credit_cards').select('*, bank:banks(*)').eq('workspace_id', ws.id).order('created_at'),
    supabase.from('banks').select('*').eq('workspace_id', ws.id),
    supabase.from('personal_members').select('*').eq('workspace_id', ws.id),
  ])

  return (
    <CardsClient
      cards={cardsRes.data ?? []}
      banks={banksRes.data ?? []}
      members={membersRes.data ?? []}
      workspaceId={ws.id}
    />
  )
}
