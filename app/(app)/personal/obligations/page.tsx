import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ObligationsClient from './ObligationsClient'

export default async function ObligationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase.from('workspaces').select('id').eq('type', 'personal').single()
  if (!ws) redirect('/select')

  const [oblRes, membersRes] = await Promise.all([
    supabase.from('obligations').select('*, personal_member:personal_members(name,color)').eq('workspace_id', ws.id).order('name'),
    supabase.from('personal_members').select('*').eq('workspace_id', ws.id),
  ])

  return (
    <ObligationsClient
      obligations={oblRes.data ?? []}
      members={membersRes.data ?? []}
      workspaceId={ws.id}
    />
  )
}
